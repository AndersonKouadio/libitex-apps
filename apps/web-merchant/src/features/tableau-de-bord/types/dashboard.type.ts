export interface IKpiTableauDeBord {
  recettesJour: number;
  ticketsJour: number;
  ticketMoyen: number;
  nombreProduits: number;
  nombreEmplacements: number;
}

export interface IPointVentesJour {
  date: string;
  recettes: number;
  nombre: number;
}

export type MethodePaiement = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT";

export interface ITopProduit {
  variantId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  quantiteTotale: number;
  chiffreAffaires: number;
  nombreVentes: number;
}

export interface IRepartitionPaiement {
  methode: MethodePaiement;
  total: number;
  nombre: number;
  pourcentage: number;
}

export interface ITendance {
  variation: number | null;
  precedente: number;
}

export interface IKpisPeriode {
  recettes: number;
  tickets: number;
  ticketMoyen: number;
  tendanceRecettes: ITendance;
  tendanceTickets: ITendance;
  tendanceTicketMoyen: ITendance;
}
