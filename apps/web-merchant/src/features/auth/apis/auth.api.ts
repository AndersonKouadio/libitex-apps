import { httpClient } from "@/lib/http";
import type { IAuthResponse } from "../types/auth.type";
import type { ConnexionDTO, InscriptionDTO } from "../schemas/auth.schema";

const BASE = "/auth";

export interface IProfilUtilisateur {
  id: string;
  email: string;
  prenom: string;
  nomFamille: string;
  telephone?: string;
}

export interface ModifierProfilDTO {
  prenom?: string;
  nomFamille?: string;
  telephone?: string;
}

export interface IConnexionMfaRequise {
  requiresMfa: true;
  mfaChallenge: string;
  email: string;
}

export interface IMfaSetupResponse {
  secret: string;
  urlProvisionning: string;
}

export const authAPI = {
  connecter: (data: ConnexionDTO) =>
    httpClient.post<IAuthResponse | IConnexionMfaRequise>(`${BASE}/connexion`, data),

  verifierMfa: (data: { mfaChallenge: string; code: string }) =>
    httpClient.post<IAuthResponse>(`${BASE}/mfa/verify`, data),

  setupMfa: (token: string) =>
    httpClient.post<IMfaSetupResponse>(`${BASE}/mfa/setup`, {}, { token }),

  activerMfa: (token: string, code: string) =>
    httpClient.post<{ ok: true }>(`${BASE}/mfa/enable`, { code }, { token }),

  desactiverMfa: (token: string, motDePasse: string) =>
    httpClient.post<{ ok: true }>(`${BASE}/mfa/disable`, { motDePasse }, { token }),

  inscrire: (data: InscriptionDTO) =>
    httpClient.post<IAuthResponse>(`${BASE}/inscription`, data),

  changerMotDePasse: (
    token: string,
    data: { motDePasseActuel: string; nouveauMotDePasse: string },
  ) => httpClient.post<{ ok: true }>(`${BASE}/changer-mot-de-passe`, data, { token }),

  demanderReset: (email: string) =>
    httpClient.post<{ ok: true }>(`${BASE}/mot-de-passe-oublie`, { email }),

  reinitialiser: (data: { token: string; nouveauMotDePasse: string }) =>
    httpClient.post<{ ok: true }>(`${BASE}/reinitialiser-mot-de-passe`, data),

  obtenirProfil: (token: string) =>
    httpClient.get<IProfilUtilisateur>(`${BASE}/profil`, { token }),

  modifierProfil: (token: string, data: ModifierProfilDTO) =>
    httpClient.patch<IProfilUtilisateur>(`${BASE}/profil`, data, { token }),

  supprimerCompte: (token: string, motDePasse: string) =>
    httpClient.delete<{ ok: true }>(`${BASE}/compte`, { token, body: { motDePasse } }),
};
