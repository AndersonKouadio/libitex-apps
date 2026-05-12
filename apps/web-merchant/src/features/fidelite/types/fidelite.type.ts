export interface IConfigFidelite {
  actif: boolean;
  nomProgramme: string;
  /** F CFA depenses pour gagner 1 point. */
  ratioGain: number;
  /** Valeur d'1 point en F CFA. */
  valeurPoint: number;
  /** Seuil minimum pour utiliser des points. */
  seuilUtilisation: number;
}

export interface ISoldeFidelite {
  solde: number;
  valeurEnFcfa: number;
}

export type TypeTransactionFidelite = "EARN" | "REDEEM" | "ADJUST";

export interface ITransactionFidelite {
  id: string;
  points: number;
  type: TypeTransactionFidelite;
  ticketId: string | null;
  ticketNumero: string | null;
  note: string | null;
  creeLe: string;
}
