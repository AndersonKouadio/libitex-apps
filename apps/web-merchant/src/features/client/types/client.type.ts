export interface IClient {
  id: string;
  prenom: string;
  nomFamille: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  creeLe: string;
}

export interface IKpisClient {
  caTotal: number;
  nbTickets: number;
  ticketMoyen: number;
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
