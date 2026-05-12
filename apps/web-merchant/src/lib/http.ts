import { marquerOnline, marquerOffline } from "./network-status";
import { STORAGE_KEYS } from "./storage-keys";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

/**
 * Erreur HTTP enrichie avec le status code de la reponse. Permet aux
 * callers de distinguer les erreurs metier (4xx) des erreurs serveur
 * (5xx) : ex. useSyncOffline retry auto sur 5xx mais marque definitif
 * sur 4xx. Sans ca on n'avait que `err.message` -> impossible de prendre
 * la bonne decision sans parser le message.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly path?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  /** 4xx : erreur du client / metier — ne pas retry sans intervention. */
  isClientError(): boolean { return this.status >= 400 && this.status < 500; }

  /** 5xx : erreur serveur — souvent transitoire, retry-safe avec backoff. */
  isServerError(): boolean { return this.status >= 500 && this.status < 600; }
}

// ─── Token refresh listeners ────────────────────────────────────────────

/**
 * Notifie quand l'access token est rafraichi automatiquement (succes).
 * AuthProvider s'enregistre ici pour synchroniser son state React.
 */
type TokenListener = (accessToken: string, refreshToken: string) => void;
const tokenListeners = new Set<TokenListener>();

export function onTokenRefreshed(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

// ─── Auth expired listeners (logout global) ─────────────────────────────

/**
 * Notifie quand le refresh a definitivement echoue (403, refresh token
 * invalide, expire, revoque, etc.). AuthProvider catch cet event pour
 * deconnecter l'utilisateur + rediriger vers /connexion.
 *
 * Distinguer de `onTokenRefreshed` : refresh OK vs refresh KO definitif.
 * Sans ce mecanisme, l'utilisateur restait sur l'ecran avec un token
 * mort et des 401 en cascade (fix C4 de la revue).
 */
type AuthExpiredListener = () => void;
const expiredListeners = new Set<AuthExpiredListener>();

export function onAuthExpired(listener: AuthExpiredListener): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function notifierAuthExpired(): void {
  for (const l of expiredListeners) l();
}

// ─── Refresh token (promise partagee) ───────────────────────────────────

/**
 * Promise partagee : si plusieurs requetes simultanees tombent en 401,
 * un seul appel /auth/refresh est lance. Toutes attendent puis retry
 * avec le nouveau token.
 *
 * Pattern : on assigne `refreshInFlight` AVANT de demarrer l'async pour
 * que la fenetre de race ne dure que le temps de l'evaluation synchrone
 * (fix I5 — l'ancien `setTimeout(0)` etait fragile).
 */
let refreshInFlight: Promise<string | null> | null = null;

export function forcerRafraichissementToken(): Promise<string | null> {
  return rafraichirToken();
}

async function rafraichirToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<string | null> => {
    try {
      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.AUTH_REFRESH)
        : null;
      if (!refreshToken) {
        // Pas de refresh dispo (premier load sans login) : ne broadcast
        // PAS authExpired (ce n'est pas une session perdue, c'est pas
        // de session du tout).
        return null;
      }

      const r = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!r.ok) {
        // 4xx/5xx : refresh definitivement KO. On notifie les listeners
        // (AuthProvider) qui vont deconnecter + rediriger.
        notifierAuthExpired();
        return null;
      }

      const json = await r.json();
      const data = json.data ?? json;
      const nouveauAccess = data.accessToken as string;
      const nouveauRefresh = data.refreshToken as string;
      if (!nouveauAccess || !nouveauRefresh) {
        notifierAuthExpired();
        return null;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, nouveauAccess);
        localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH, nouveauRefresh);
      }
      for (const l of tokenListeners) l(nouveauAccess, nouveauRefresh);
      return nouveauAccess;
    } catch {
      // Erreur reseau pendant le refresh : pas une session morte mais
      // un probleme connectivite. On ne broadcast pas authExpired.
      return null;
    } finally {
      // Liberer le slot SYNCHRONIQUEMENT a la fin de l'async. Le
      // setTimeout(0) precedent n'apportait rien et masquait la logique.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ─── HTTP client ────────────────────────────────────────────────────────

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    opts: RequestOptions = {},
    retried = false,
  ): Promise<T> {
    const { token, body, ...rest } = opts;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...rest,
      });
    } catch (err) {
      // TypeError de fetch = pas de reseau ou DNS / TLS. On bascule l'app
      // en mode offline pour que le banner + la file d'attente prennent
      // le relais.
      marquerOffline();
      throw err;
    }
    // Toute reponse HTTP (meme 5xx) prouve qu'on a du reseau.
    marquerOnline();

    // 401 + on a un token + pas deja retry + endpoint non-refresh : tenter
    // un refresh automatique transparent (token expire en plein service).
    if (response.status === 401 && token && !retried && !path.startsWith("/auth/refresh")) {
      const nouveauToken = await rafraichirToken();
      if (nouveauToken) {
        return this.request<T>(method, path, { ...opts, token: nouveauToken }, true);
      }
      // Refresh KO : on notifie deja via notifierAuthExpired() depuis
      // rafraichirToken. On laisse l'erreur 401 remonter au caller.
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      // Si message est un tableau (validation NestJS) on prend le 1er.
      const msgRaw = errorBody?.error || errorBody?.message || `Erreur ${response.status}`;
      const msg = Array.isArray(msgRaw) ? msgRaw[0] : msgRaw;
      throw new HttpError(response.status, msg, path);
    }

    if (response.status === 204) return undefined as T;

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  get<T>(path: string, opts?: RequestOptions) {
    return this.request<T>("GET", path, opts);
  }

  post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("POST", path, { ...opts, body });
  }

  patch<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("PATCH", path, { ...opts, body });
  }

  delete<T>(path: string, opts?: RequestOptions) {
    return this.request<T>("DELETE", path, opts);
  }
}

export const httpClient = new HttpClient(BASE_URL);
