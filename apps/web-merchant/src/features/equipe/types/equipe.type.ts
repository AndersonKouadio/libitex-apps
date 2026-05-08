export type RoleMembre =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "COMMERCIAL"
  | "CASHIER"
  | "WAREHOUSE";

export interface IMembre {
  membershipId: string;
  userId: string;
  email: string;
  prenom: string;
  nomFamille: string;
  telephone: string | null;
  role: RoleMembre;
  isOwner: boolean;
  accessAllLocations: boolean;
  locationIds: string[];
  isActive: boolean;
  invitedAt: string | null;
  acceptedAt: string | null;
  derniereConnexion: string | null;
}

export interface IInvitationResultat {
  membre: IMembre;
  motDePasseTemporaire: string;
  message: string;
}

export const ROLES_LABELS: Record<RoleMembre, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  COMMERCIAL: "Commercial",
  CASHIER: "Caissier",
  WAREHOUSE: "Magasinier",
};

export const ROLES_DESCRIPTIONS: Record<RoleMembre, string> = {
  SUPER_ADMIN: "Accès total au système",
  ADMIN: "Gestion complète de la boutique : équipe, paramètres, finances",
  MANAGER: "Catalogue, stock, réceptions, rapports, équipe (sauf admins)",
  COMMERCIAL: "Ventes, clients, devis et factures",
  CASHIER: "Encaissement à la caisse uniquement",
  WAREHOUSE: "Réception, transferts et inventaire de stock",
};

export const ROLES_INVITABLES: RoleMembre[] = [
  "ADMIN",
  "MANAGER",
  "COMMERCIAL",
  "CASHIER",
  "WAREHOUSE",
];
