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
  /** Lien optionnel vers une fiche client (CRM). Permet l'historique d'achats. */
  clientId?: string | null;
  nomClient?: string;
  telephoneClient?: string;
  /** Note libre du ticket : "Table 3", "A emporter", "Sans piment"... */
  note?: string;
  lignes: ILigneTicket[];
  paiements: IPaiement[];
  completeLe?: string;
  creeLe: string;
  /** A3 — 'SALE' (defaut) ou 'RETURN'. */
  type?: string;
  /** A3 — ID du ticket d'origine si c'est un retour. */
  refTicketId?: string | null;
}

/** A3 — Payload pour créer un ticket de retour. */
export interface IRetourTicketPayload {
  lignes: { ligneId: string; quantite: number }[];
  methodeRemboursement: string;
  reference?: string;
  motif?: string;
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
  topProduits: {
    variantId: string;
    nomProduit: string;
    nomVariante: string | null;
    sku: string;
    quantite: number;
    chiffreAffaires: number;
  }[];
  ventesParHeure: {
    heure: number;
    recettes: number;
    nombre: number;
  }[];
}

export interface ILigneVentePeriode {
  date: string;
  recettes: number;
  nombre: number;
  tva: number;
  remises: number;
  ticketMoyen: number;
}

export interface IRapportVentesPeriode {
  debut: string;
  fin: string;
  emplacementId: string | null;
  jours: ILigneVentePeriode[];
  totaux: {
    recettes: number;
    tickets: number;
    tva: number;
    remises: number;
    ticketMoyen: number;
  };
}

export interface ILigneMarge {
  variantId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  quantiteTotale: number;
  chiffreAffaires: number;
  coutTotal: number;
  margeBrute: number;
  margePourcent: number;
  prixAchatManquant: boolean;
}

export interface ILigneTva {
  taux: number;
  baseHt: number;
  tva: number;
  totalTtc: number;
  nombreLignes: number;
}

export interface IRapportTva {
  debut: string;
  fin: string;
  emplacementId: string | null;
  taux: ILigneTva[];
  totaux: {
    baseHt: number;
    tva: number;
    totalTtc: number;
    nombreLignes: number;
  };
}

export interface IRapportMarges {
  debut: string;
  fin: string;
  emplacementId: string | null;
  lignes: ILigneMarge[];
  totaux: {
    chiffreAffaires: number;
    coutTotal: number;
    margeBrute: number;
    margePourcent: number;
    quantiteTotale: number;
  };
}

export enum MethodePaiement {
  CASH = "CASH",
  CARD = "CARD",
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CREDIT = "CREDIT",
}

/**
 * Ligne du journal des ventes — en-tete de ticket sans detail lignes/paiements.
 */
export interface ILigneJournal {
  id: string;
  ticketNumber: string;
  status: string;
  total: number;
  discountAmount: number;
  createdAt: string | null;
  completedAt: string | null;
  locationId: string;
  nomEmplacement: string | null;
  customerId: string | null;
  nomClient: string | null;
}
