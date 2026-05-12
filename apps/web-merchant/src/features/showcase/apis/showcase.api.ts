import type {
  IBoutiquePublic, IProduitPublic, ICategoriePublique,
} from "../types/showcase.type";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * Endpoints publics du showcase. Pas de token, pas d'auth. Le httpClient
 * authentifie n'est volontairement pas utilise ici pour s'assurer qu'on
 * n'envoie jamais le token du commercant sur ces routes.
 */
async function fetchPublic<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/public/boutiques${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new Error(body?.error || body?.message || `Erreur ${r.status}`);
  }
  if (r.status === 204) return undefined as T;
  const json = await r.json();
  return json.data !== undefined ? json.data : json;
}

export const showcaseAPI = {
  obtenirBoutique: (slug: string) =>
    fetchPublic<IBoutiquePublic>(`/${slug}`),

  listerProduits: (slug: string, categorieId?: string) => {
    const qs = categorieId ? `?categorieId=${encodeURIComponent(categorieId)}` : "";
    return fetchPublic<IProduitPublic[]>(`/${slug}/produits${qs}`);
  },

  obtenirProduit: (slug: string, id: string) =>
    fetchPublic<IProduitPublic>(`/${slug}/produits/${id}`),

  listerCategories: (slug: string) =>
    fetchPublic<ICategoriePublique[]>(`/${slug}/categories`),
};
