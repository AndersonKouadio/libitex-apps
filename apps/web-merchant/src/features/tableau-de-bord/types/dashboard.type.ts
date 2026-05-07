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

export interface IKpiTableauDeBord {
  caJour: number;
  ventesJour: number;
  nombreProduits: number;
  nombreEmplacements: number;
  ticketMoyen: number;
}
