export type TypeProduit = "SIMPLE" | "VARIANT" | "SERIALIZED" | "PERISHABLE";

export type SecteurActivite =
  | "VETEMENT"
  | "ALIMENTAIRE"
  | "ELECTRONIQUE"
  | "RESTAURATION"
  | "BEAUTE_COSMETIQUE"
  | "QUINCAILLERIE"
  | "LIBRAIRIE"
  | "PHARMACIE"
  | "BIJOUTERIE"
  | "AUTRE";

export interface IUtilisateurSession {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  prenom: string;
  nomFamille: string;
}

export interface IBoutiqueResume {
  id: string;
  nom: string;
  slug: string;
  secteurActivite: SecteurActivite;
  devise: string;
  role: string;
  isOwner: boolean;
}

export interface IBoutiqueDetail {
  id: string;
  nom: string;
  slug: string;
  secteurActivite: SecteurActivite;
  typesProduitsAutorises: TypeProduit[];
  devise: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  utilisateur: IUtilisateurSession;
  boutiques: IBoutiqueResume[];
  boutiqueActive: IBoutiqueResume;
}
