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
