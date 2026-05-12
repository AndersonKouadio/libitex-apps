import type {
  IBoutiquePublic, IProduitPublic, ICategoriePublique, IPageProduitsPublics,
} from "../types/showcase.type";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface ListerProduitsPublicsOptions {
  categorieId?: string;
  recherche?: string;
  limit?: number;
  offset?: number;
}

/**
 * Endpoints publics du showcase. Pas de token, pas d'auth. Le httpClient
 * authentifie n'est volontairement pas utilise ici pour s'assurer qu'on
 * n'envoie jamais le token du commercant sur ces routes.
 *
 * Accepte un `init` pour permettre aux Server Components de passer
 * `next: { revalidate: 60 }` (cache cote serveur Next.js).
 */
async function fetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}/public/boutiques${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    const err: Error & { status?: number } = new Error(
      body?.error || body?.message || `Erreur ${r.status}`,
    );
    err.status = r.status;
    throw err;
  }
  if (r.status === 204) return undefined as T;
  const json = await r.json();
  return json.data !== undefined ? json.data : json;
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const showcaseAPI = {
  obtenirBoutique: (slug: string, init?: RequestInit) =>
    fetchPublic<IBoutiquePublic>(`/${slug}`, init),

  listerProduits: (slug: string, opts: ListerProduitsPublicsOptions = {}, init?: RequestInit) => {
    const qs = buildQs({
      categorieId: opts.categorieId,
      recherche: opts.recherche,
      limit: opts.limit,
      offset: opts.offset,
    });
    return fetchPublic<IPageProduitsPublics>(`/${slug}/produits${qs}`, init);
  },

  obtenirProduit: (slug: string, id: string, init?: RequestInit) =>
    fetchPublic<IProduitPublic>(`/${slug}/produits/${id}`, init),

  listerCategories: (slug: string, init?: RequestInit) =>
    fetchPublic<ICategoriePublique[]>(`/${slug}/categories`, init),
};
