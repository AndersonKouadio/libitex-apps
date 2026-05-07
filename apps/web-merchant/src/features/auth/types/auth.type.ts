export interface IUtilisateurSession {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  prenom: string;
  nomFamille: string;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  utilisateur: IUtilisateurSession;
}
