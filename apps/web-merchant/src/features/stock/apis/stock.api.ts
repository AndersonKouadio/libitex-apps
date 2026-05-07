import { httpClient } from "@/lib/http";
import type { IEmplacement, IStockActuel, IStockEmplacement } from "../types/stock.type";

const BASE = "/stock";

export const stockAPI = {
  listerEmplacements: (token: string) =>
    httpClient.get<IEmplacement[]>(`${BASE}/emplacements`, { token }),

  creerEmplacement: (token: string, data: { nom: string; type?: string; adresse?: string }) =>
    httpClient.post<IEmplacement>(`${BASE}/emplacements`, data, { token }),

  entreeStock: (token: string, data: {
    varianteId: string; emplacementId: string; quantite: number; note?: string;
  }) =>
    httpClient.post(`${BASE}/entree`, data, { token }),

  transferer: (token: string, data: {
    varianteId: string; depuisEmplacementId: string; versEmplacementId: string;
    quantite: number; note?: string;
  }) =>
    httpClient.post(`${BASE}/transfert`, data, { token }),

  obtenirStockActuel: (token: string, varianteId: string, emplacementId: string) =>
    httpClient.get<IStockActuel>(`${BASE}/actuel/${varianteId}/${emplacementId}`, { token }),

  stockParEmplacement: (token: string, emplacementId: string) =>
    httpClient.get<IStockEmplacement[]>(`${BASE}/emplacement/${emplacementId}`, { token }),
};
