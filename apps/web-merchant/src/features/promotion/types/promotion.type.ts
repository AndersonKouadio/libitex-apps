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
