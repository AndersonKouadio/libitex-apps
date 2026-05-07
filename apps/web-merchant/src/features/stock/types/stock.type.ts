export interface IEmplacement {
  id: string;
  nom: string;
  type: string;
  adresse: string | null;
}

export interface IStockActuel {
  varianteId: string;
  emplacementId: string;
  quantite: number;
}

export interface IStockEmplacement {
  varianteId: string;
  quantite: number;
}
