export interface IFournisseur {
  id: string;
  nom: string;
  nomContact: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  conditionsPaiement: string | null;
  notes: string | null;
  actif: boolean;
  creeLe: string;
}

export type StatutCommande = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export interface ILigneCommande {
  id: string;
  varianteId: string;
  produitId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  quantiteCommandee: number;
  quantiteRecue: number;
  prixUnitaire: number;
  totalLigne: number;
}

export interface ICommande {
  id: string;
  numero: string;
  fournisseurId: string;
  nomFournisseur: string;
  emplacementId: string;
  statut: StatutCommande;
  montantTotal: number;
  dateAttendue: string | null;
  dateReception: string | null;
  notes: string | null;
  creeLe: string;
  lignes?: ILigneCommande[];
}
