import { httpClient } from "@/lib/http";
import type { IAuthResponse } from "@/features/auth/types/auth.type";
import type { IBoutiqueResume, IBoutiqueDetail } from "../types/boutique.type";
import type { CreerBoutiqueDTO } from "@/features/auth/schemas/auth.schema";

const BASE = "/boutiques";

export const boutiqueAPI = {
  obtenirActive: (token: string) =>
    httpClient.get<IBoutiqueDetail>(`${BASE}/mienne`, { token }),

  lister: (token: string) =>
    httpClient.get<IBoutiqueResume[]>(BASE, { token }),

  creer: (token: string, data: CreerBoutiqueDTO) =>
    httpClient.post<IBoutiqueResume>(BASE, data, { token }),

  switcher: (token: string, tenantId: string) =>
    httpClient.post<IAuthResponse>(`${BASE}/${tenantId}/switch`, undefined, { token }),
};
