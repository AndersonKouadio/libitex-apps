import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type { IProduit, ICategorie } from "../types/produit.type";

const BASE = "/catalogue";

export const catalogueAPI = {
  listerProduits: (
    token: string,
    params?: {
      page?: number;
      recherche?: string;
      isSupplement?: boolean;
      typeProduit?: string;
      categorieId?: string;
      actif?: boolean;
    },
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params?.page ?? 1));
    if (params?.recherche) qs.set("recherche", params.recherche);
    if (params?.isSupplement !== undefined) qs.set("isSupplement", String(params.isSupplement));
    if (params?.typeProduit) qs.set("typeProduit", params.typeProduit);
    if (params?.categorieId) qs.set("categorieId", params.categorieId);
    if (params?.actif !== undefined) qs.set("actif", String(params.actif));
    return httpClient.get<PaginatedResponse<IProduit>>(
      `${BASE}/produits?${qs.toString()}`,
      { token },
    );
  },

  obtenirProduit: (token: string, id: string) =>
    httpClient.get<IProduit>(`${BASE}/produits/${id}`, { token }),

  creerProduit: (token: string, data: unknown) =>
    httpClient.post<IProduit>(`${BASE}/produits`, data, { token }),

  modifierProduit: (token: string, id: string, data: unknown) =>
    httpClient.patch<IProduit>(`${BASE}/produits/${id}`, data, { token }),

  supprimerProduit: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/produits/${id}`, { token }),

  modifierVariante: (
    token: string,
    produitId: string,
    varianteId: string,
    data: unknown,
  ) =>
    httpClient.patch(`${BASE}/produits/${produitId}/variantes/${varianteId}`, data, { token }),

  importerProduits: (token: string, produits: unknown[]) =>
    httpClient.post<{
      succes: number;
      total: number;
      erreurs: Array<{ ligne: number; nom: string; message: string }>;
    }>(`${BASE}/produits/import`, { produits }, { token }),

  listerCategories: (token: string) =>
    httpClient.get<ICategorie[]>(`${BASE}/categories`, { token }),

  creerCategorie: (token: string, data: { nom: string; parentId?: string }) =>
    httpClient.post<ICategorie>(`${BASE}/categories`, data, { token }),

  modifierCategorie: (token: string, id: string, data: { nom?: string; parentId?: string }) =>
    httpClient.patch<ICategorie>(`${BASE}/categories/${id}`, data, { token }),

  supprimerCategorie: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/categories/${id}`, { token }),
};
