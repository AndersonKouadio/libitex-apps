import { httpClient } from "@/lib/http";
import type { IAuthResponse } from "../types/auth.type";
import type { ConnexionDTO, InscriptionDTO } from "../schemas/auth.schema";

const BASE = "/auth";

export const authAPI = {
  connecter: (data: ConnexionDTO) =>
    httpClient.post<IAuthResponse>(`${BASE}/connexion`, data),

  inscrire: (data: InscriptionDTO) =>
    httpClient.post<IAuthResponse>(`${BASE}/inscription`, data),

  changerMotDePasse: (
    token: string,
    data: { motDePasseActuel: string; nouveauMotDePasse: string },
  ) => httpClient.post<{ ok: true }>(`${BASE}/changer-mot-de-passe`, data, { token }),
};
