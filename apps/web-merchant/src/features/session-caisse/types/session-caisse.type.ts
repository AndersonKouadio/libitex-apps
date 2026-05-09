export type StatutSession = "OPEN" | "CLOSED";

export type MethodeFond = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER";

export interface FondParMethode {
  CASH: number;
  CARD: number;
  MOBILE_MONEY: number;
  BANK_TRANSFER: number;
}

export interface ISessionCaisse {
  id: string;
  numeroSession: string;
  emplacementId: string;
  emplacementNom: string;
  caissierId: string;
  caissierNom: string;
  statut: StatutSession;
  fondInitial: FondParMethode;
  fondFinalTheorique: FondParMethode | null;
  fondFinalDeclare: FondParMethode | null;
  ecart: FondParMethode | null;
  commentaireOuverture: string | null;
  commentaireFermeture: string | null;
  ouvertA: string;
  fermeA: string | null;
  nombreTickets?: number;
  totalEncaisse?: number;
}

export interface ITicketEnCours {
  id: string;
  numeroTicket: string;
  statut: "OPEN" | "PARKED";
  total: number;
  creeLe: string;
}

export interface IRecapitulatifFermeture {
  session: ISessionCaisse;
  ticketsEnCours: ITicketEnCours[];
  ventilationPaiements: { methode: string; nombre: number; total: number }[];
}
