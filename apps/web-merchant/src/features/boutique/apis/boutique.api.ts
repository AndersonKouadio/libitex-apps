import { httpClient } from "@/lib/http";
import type { IAuthResponse } from "@/features/auth/types/auth.type";
import type { IBoutiqueResume, IBoutiqueDetail } from "../types/boutique.type";
import type { CreerBoutiqueDTO } from "@/features/auth/schemas/auth.schema";

const BASE = "/boutiques";

export interface ModifierBoutiqueDTO {
  nom?: string;
  devise?: string;
  secteurActivite?: string;
  typesProduitsAutorises?: string[];
  email?: string;
  telephone?: string;
  adresse?: string;
}

export const boutiqueAPI = {
  obtenirActive: (token: string) =>
    httpClient.get<IBoutiqueDetail>(`${BASE}/mienne`, { token }),

  obtenir: (token: string, tenantId: string) =>
    httpClient.get<IBoutiqueDetail>(`${BASE}/${tenantId}`, { token }),

  lister: (token: string) =>
    httpClient.get<IBoutiqueResume[]>(BASE, { token }),

  creer: (token: string, data: CreerBoutiqueDTO) =>
    httpClient.post<IBoutiqueResume>(BASE, data, { token }),

  modifier: (token: string, tenantId: string, data: ModifierBoutiqueDTO) =>
    httpClient.patch<IBoutiqueDetail>(`${BASE}/${tenantId}`, data, { token }),

  supprimer: (token: string, tenantId: string) =>
    httpClient.delete<void>(`${BASE}/${tenantId}`, { token }),

  switcher: (token: string, tenantId: string) =>
    httpClient.post<IAuthResponse>(`${BASE}/${tenantId}/switch`, undefined, { token }),
};
