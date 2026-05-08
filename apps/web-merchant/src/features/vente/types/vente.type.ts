import type { UniteMesure } from "@/features/unite/types/unite.type";

export interface ISupplementLigne {
  supplementId: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
}

export interface ILigneTicket {
  id: string;
  varianteId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  tauxTva: number;
  montantTva: number;
  totalLigne: number;
  /** Unite de la quantite. Utilisee a l'affichage et au scellement du ticket. */
  uniteVente?: UniteMesure;
  /** Pas minimum a la saisie (recopie depuis la variante a la reprise). */
  pasMin?: number | null;
  /** Vrai si le prix unitaire est par unite de mesure. */
  prixParUnite?: boolean;
  numeroSerie?: string;
  numeroLot?: string;
  supplements: ISupplementLigne[];
}

export interface IPaiement {
  id: string;
  methode: string;
  montant: number;
  reference?: string;
}

export interface ITicket {
  id: string;
  numeroTicket: string;
  statut: string;
  sousTotal: number;
  montantTva: number;
  montantRemise: number;
  total: number;
  nomClient?: string;
  telephoneClient?: string;
  lignes: ILigneTicket[];
  paiements: IPaiement[];
  completeLe?: string;
  creeLe: string;
}

export interface IRapportZ {
  date: string;
  emplacementId: string;
  resume: {
    totalTickets: number;
    chiffreAffaires: number;
    totalTva: number;
    totalRemise: number;
  };
  ventilationPaiements: {
    methode: string;
    total: number;
    nombre: number;
  }[];
}

export enum MethodePaiement {
  CASH = "CASH",
  CARD = "CARD",
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CREDIT = "CREDIT",
}
