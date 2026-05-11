export type SegmentClient = "VIP" | "REGULIER" | "OCCASIONNEL" | "INACTIF" | "NOUVEAU";

export interface IClient {
  id: string;
  prenom: string;
  nomFamille: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  creeLe: string;
  /** Calcule cote backend, present quand la source est la liste. */
  segment?: SegmentClient;
  caTotal?: number;
  nbTickets?: number;
  dernierAchat?: string | null;
}

export interface IKpisClient {
  caTotal: number;
  nbTickets: number;
  ticketMoyen: number;
  segment: SegmentClient;
  premierAchat: string | null;
  dernierAchat: string | null;
}

export interface ILigneHistoriqueClient {
  id: string;
  numeroTicket: string;
  total: number;
  completeLe: string | null;
  emplacementId: string;
}

export interface IHistoriqueClient {
  data: ILigneHistoriqueClient[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
