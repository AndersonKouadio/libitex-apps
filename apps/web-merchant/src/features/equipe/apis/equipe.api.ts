import { httpClient } from "@/lib/http";
import type { IMembre, IInvitationResultat } from "../types/equipe.type";
import type { InviterMembreDTO, ModifierMembreDTO } from "../schemas/equipe.schema";

const BASE = "/equipe";

export const equipeAPI = {
  lister: (token: string) =>
    httpClient.get<IMembre[]>(BASE, { token }),

  inviter: (token: string, data: InviterMembreDTO) =>
    httpClient.post<IInvitationResultat>(BASE, data, { token }),

  modifier: (token: string, membershipId: string, data: ModifierMembreDTO) =>
    httpClient.patch<IMembre>(`${BASE}/${membershipId}`, data, { token }),

  retirer: (token: string, membershipId: string) =>
    httpClient.delete<void>(`${BASE}/${membershipId}`, { token }),
};
