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
  /** Prix unitaire en devise tenant (XOF). Converti depuis prixUnitaireDevise via tauxChange. */
  prixUnitaire: number;
  /** Phase A.5 : prix unitaire en devise de la commande (CNY, EUR, USD...). */
  prixUnitaireDevise: number;
  totalLigne: number;
  /**
   * Phase A.4 : CUMP actuel de la variante (avant la prochaine reception).
   * Permet le preview "avant/apres" dans la modale de reception.
   */
  cumpActuel: number;
}

export interface ICommande {
  id: string;
  numero: string;
  fournisseurId: string;
  nomFournisseur: string;
  emplacementId: string;
  nomEmplacement: string;
  statut: StatutCommande;
  /** Montant total HT en devise tenant (XOF). */
  montantTotal: number;
  /**
   * Phase A.5 : devise de la commande (devise fournisseur).
   * Defaut XOF. Format ISO 4217 : XOF, EUR, USD, CNY, GBP, MAD, GHS, NGN.
   */
  devise: string;
  /**
   * Phase A.5 : taux de change devise -> XOF, fige a la creation.
   * 1.0 si meme devise que le tenant.
   */
  tauxChange: number;
  /**
   * Phase A.5 : sous-total HT en devise commande (somme des lignes en devise).
   * Si devise = XOF, identique a montantTotal.
   */
  sousTotalDevise: number;
  /** Phase A.2 : somme des frais d'approche en devise tenant. */
  fraisTotal: number;
  /** Phase A.2 : montantTotal + fraisTotal. */
  totalDebarque: number;
  /** Phase A.2 : methode de ventilation des frais sur les lignes. */
  methodeAllocation: MethodeAllocation;
  dateAttendue: string | null;
  dateReception: string | null;
  notes: string | null;
  creeLe: string;
  lignes?: ILigneCommande[];
}

// ─── Phase A.2 : Frais d'approche (Landed Cost) ───

export const CATEGORIES_FRAIS = [
  "TRANSPORT",
  "CUSTOMS",
  "TRANSIT",
  "INSURANCE",
  "HANDLING",
  "OTHER",
] as const;
export type CategorieFrais = (typeof CATEGORIES_FRAIS)[number];

export const METHODES_ALLOCATION = ["QUANTITY", "WEIGHT", "VALUE"] as const;
export type MethodeAllocation = (typeof METHODES_ALLOCATION)[number];

export interface IFrais {
  id: string;
  categorie: CategorieFrais;
  libelle: string;
  montant: number;
  devise: string;
  tauxChange: number;
  /** Montant converti en devise tenant (montant * tauxChange). */
  montantEnBase: number;
  notes: string | null;
  creeLe: string;
}

/** Libelles FR pour les categories de frais. */
export const LIBELLE_CATEGORIE_FRAIS: Record<CategorieFrais, string> = {
  TRANSPORT: "Transport",
  CUSTOMS: "Douane",
  TRANSIT: "Transit",
  INSURANCE: "Assurance",
  HANDLING: "Manutention",
  OTHER: "Autre",
};

/** Libelles FR pour les methodes d'allocation. */
export const LIBELLE_METHODE_ALLOCATION: Record<MethodeAllocation, string> = {
  QUANTITY: "Par quantite",
  WEIGHT: "Par poids",
  VALUE: "Par valeur",
};
