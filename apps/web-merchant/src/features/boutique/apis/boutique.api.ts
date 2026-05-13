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
  tauxTva?: number;
  methodesPaiement?: Array<"CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT">;
  /** Module 14 D1 : URL du logo. null efface, undefined ne touche pas. */
  logoUrl?: string | null;
}

export const boutiqueAPI = {
  obtenirActive: (token: string) =>
    httpClient.get<IBoutiqueDetail>(`${BASE}/mienne`, { token }),

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
