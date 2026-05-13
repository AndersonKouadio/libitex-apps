export type TypePromotion = "PERCENTAGE" | "FIXED_AMOUNT";

export interface IPromotion {
  id: string;
  code: string;
  description: string | null;
  type: TypePromotion;
  valeur: number;
  montantMin: number;
  remiseMax: number | null;
  dateDebut: string | null;
  dateFin: string | null;
  limiteUtilisations: number | null;
  usageCount: number;
  limiteParClient: number | null;
  actif: boolean;
  creeLe: string;
}

export interface IResultatValidation {
  valide: boolean;
  raison: string | null;
  remise: number;
  promotion?: IPromotion;
}

/** Module 11 D3 : statistiques consolidees d'un code promo. */
export interface IStatsPromotion {
  nbUsages: number;
  totalRemise: number;
  caGenere: number;
  topClients: Array<{
    customerId: string;
    nomComplet: string;
    nbUsages: number;
    totalRemise: number;
  }>;
}
