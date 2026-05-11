import { httpClient } from "@/lib/http";
import type {
  IEmplacement, IStockActuel, IStockEmplacement, IMouvementStock, FiltreMouvements,
} from "../types/stock.type";

export interface MouvementsResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const BASE = "/stock";

export const stockAPI = {
  listerEmplacements: (token: string) =>
    httpClient.get<IEmplacement[]>(`${BASE}/emplacements`, { token }),

  creerEmplacement: (token: string, data: { nom: string; type?: string; adresse?: string }) =>
    httpClient.post<IEmplacement>(`${BASE}/emplacements`, data, { token }),

  modifierEmplacement: (
    token: string,
    id: string,
    data: { nom?: string; type?: string; adresse?: string },
  ) =>
    httpClient.patch<IEmplacement>(`${BASE}/emplacements/${id}`, data, { token }),

  supprimerEmplacement: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/emplacements/${id}`, { token }),

  entreeStock: (token: string, data: {
    varianteId: string; emplacementId: string; quantite: number; note?: string;
  }) =>
    httpClient.post(`${BASE}/entree`, data, { token }),

  ajusterStock: (token: string, data: {
    varianteId: string; emplacementId: string; quantite: number; note: string;
  }) =>
    httpClient.post(`${BASE}/ajustement`, data, { token }),

  transferer: (token: string, data: {
    varianteId: string; depuisEmplacementId: string; versEmplacementId: string;
    quantite: number; note?: string;
  }) =>
    httpClient.post(`${BASE}/transfert`, data, { token }),

  obtenirStockActuel: (token: string, varianteId: string, emplacementId: string) =>
    httpClient.get<IStockActuel>(`${BASE}/actuel/${varianteId}/${emplacementId}`, { token }),

  stockParEmplacement: (token: string, emplacementId: string) =>
    httpClient.get<IStockEmplacement[]>(`${BASE}/emplacement/${emplacementId}`, { token }),

  appliquerInventaire: (token: string, data: {
    emplacementId: string; justification: string;
    lignes: Array<{ varianteId: string; quantiteReelle: number }>;
  }) =>
    httpClient.post<{ ajustements: number; inchanges: number; total: number }>(
      `${BASE}/inventaire`, data, { token },
    ),

  listerMouvements: (token: string, filtres: FiltreMouvements) => {
    const qs = new URLSearchParams();
    qs.set("page", String(filtres.page ?? 1));
    qs.set("pageSize", String(filtres.pageSize ?? 50));
    if (filtres.type) qs.set("type", filtres.type);
    if (filtres.varianteId) qs.set("varianteId", filtres.varianteId);
    if (filtres.emplacementId) qs.set("emplacementId", filtres.emplacementId);
    if (filtres.dateDebut) qs.set("dateDebut", filtres.dateDebut);
    if (filtres.dateFin) qs.set("dateFin", filtres.dateFin);
    return httpClient.get<MouvementsResponse<IMouvementStock>>(
      `${BASE}/mouvements?${qs.toString()}`,
      { token },
    );
  },
};
