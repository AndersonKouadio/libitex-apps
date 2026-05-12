const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

/**
 * Cle localStorage utilisee pour le refreshToken. Garde en sync avec
 * useAuth.STORAGE_REFRESH.
 */
const STORAGE_REFRESH = "libitex_refresh";
const STORAGE_TOKEN = "libitex_token";

/**
 * Listeners notifies quand l'access token est rafraichi automatiquement.
 * AuthProvider s'enregistre ici pour synchroniser son state React avec
 * le nouveau token (sinon useAuth().token resterait sur l'ancien).
 */
type TokenListener = (accessToken: string, refreshToken: string) => void;
const listeners = new Set<TokenListener>();
export function onTokenRefreshed(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Promise partagee : si plusieurs requetes simultanees tombent en 401,
 * on ne declenche qu'UN seul appel /auth/refresh. Toutes les requetes
 * attendent ce refresh puis retry avec le nouveau token.
 */
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Force un refresh hors d'un flow HTTP (utilise par le WebSocket quand il
 * recoit un connect_error d'auth). Reutilise la meme promise partagee donc
 * n'enchaine pas plusieurs refresh.
 */
export function forcerRafraichissementToken(): Promise<string | null> {
  return rafraichirToken();
}

async function rafraichirToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_REFRESH)
        : null;
      if (!refreshToken) return null;

      const r = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      const data = json.data ?? json;
      const nouveauAccess = data.accessToken as string;
      const nouveauRefresh = data.refreshToken as string;
      if (!nouveauAccess || !nouveauRefresh) return null;

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_TOKEN, nouveauAccess);
        localStorage.setItem(STORAGE_REFRESH, nouveauRefresh);
      }
      for (const l of listeners) l(nouveauAccess, nouveauRefresh);
      return nouveauAccess;
    } catch {
      return null;
    } finally {
      // Liberer le slot pour permettre un futur refresh si encore besoin.
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();
  return refreshInFlight;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
    const { token, body, ...rest } = opts;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });

    // 401 + on a un token + pas deja retry + endpoint non-refresh : tenter
    // un refresh automatique transparent (token expire en plein service).
    if (response.status === 401 && token && !retried && !path.startsWith("/auth/refresh")) {
      const nouveauToken = await rafraichirToken();
      if (nouveauToken) {
        return this.request<T>(method, path, { ...opts, token: nouveauToken }, true);
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || errorBody?.message || `Erreur ${response.status}`);
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
