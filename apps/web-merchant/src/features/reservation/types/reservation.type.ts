export type StatutReservation =
  | "PENDING"
  | "CONFIRMED"
  | "SEATED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface IReservation {
  id: string;
  emplacementId: string;
  clientId: string | null;
  nomClient: string;
  telephone: string | null;
  numeroTable: string | null;
  dateReservation: string;
  nombrePersonnes: number;
  statut: StatutReservation;
  notes: string | null;
  creeLe: string;
}

export interface IResumeReservationsJour {
  date: string;
  totalReservations: number;
  totalCouverts: number;
  parStatut: Record<string, { nombre: number; couverts: number }>;
}
