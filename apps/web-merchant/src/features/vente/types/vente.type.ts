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
  numeroSerie?: string;
  numeroLot?: string;
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
    totalRevenu: number;
    totalTaxe: number;
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
