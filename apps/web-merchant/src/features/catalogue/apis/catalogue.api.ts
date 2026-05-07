import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type { IProduit, ICategorie } from "../types/produit.type";

const BASE = "/catalogue";

export const catalogueAPI = {
  listerProduits: (token: string, params?: { page?: number; recherche?: string }) =>
    httpClient.get<PaginatedResponse<IProduit>>(
      `${BASE}/produits?page=${params?.page || 1}${params?.recherche ? `&recherche=${params.recherche}` : ""}`,
      { token },
    ),

  obtenirProduit: (token: string, id: string) =>
    httpClient.get<IProduit>(`${BASE}/produits/${id}`, { token }),

  creerProduit: (token: string, data: unknown) =>
    httpClient.post<IProduit>(`${BASE}/produits`, data, { token }),

  modifierProduit: (token: string, id: string, data: unknown) =>
    httpClient.patch<IProduit>(`${BASE}/produits/${id}`, data, { token }),

  supprimerProduit: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/produits/${id}`, { token }),

  listerCategories: (token: string) =>
    httpClient.get<ICategorie[]>(`${BASE}/categories`, { token }),

  creerCategorie: (token: string, data: { nom: string; parentId?: string }) =>
    httpClient.post<ICategorie>(`${BASE}/categories`, data, { token }),
};
