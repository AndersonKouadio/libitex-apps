import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type {
  ICompteOhada, IEcritureComptable, ILigneBalance,
} from "../types/comptabilite.type";

const BASE = "/comptabilite";

export const comptabiliteAPI = {
  listerPlan: (token: string) =>
    httpClient.get<ICompteOhada[]>(`${BASE}/plan-comptable`, { token }),

  listerJournal: (token: string, params: {
    page?: number; limit?: number;
    dateDebut?: string; dateFin?: string; referenceType?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.dateDebut) qs.set("dateDebut", params.dateDebut);
    if (params.dateFin) qs.set("dateFin", params.dateFin);
    if (params.referenceType) qs.set("referenceType", params.referenceType);
    return httpClient.get<PaginatedResponse<IEcritureComptable>>(
      `${BASE}/journal?${qs}`, { token },
    );
  },

  balance: (token: string, params: { dateDebut?: string; dateFin?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.dateDebut) qs.set("dateDebut", params.dateDebut);
    if (params.dateFin) qs.set("dateFin", params.dateFin);
    return httpClient.get<ILigneBalance[]>(`${BASE}/balance?${qs}`, { token });
  },
};
