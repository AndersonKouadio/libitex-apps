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
  sku: string;
  nomProduit: string;
  nomVariante: string | null;
  typeProduit: string;
  quantite: number;
  prixAchat: number;
}

export type TypeMouvementStock =
  | "STOCK_IN" | "STOCK_OUT" | "TRANSFER_OUT" | "TRANSFER_IN"
  | "ADJUSTMENT" | "RETURN_IN" | "DEFECTIVE_OUT" | "WRITE_OFF";

export interface IMouvementStock {
  id: string;
  type: TypeMouvementStock;
  quantite: number;
  note: string | null;
  creeLe: string;
  varianteId: string;
  sku: string;
  nomProduit: string;
  nomVariante: string | null;
  emplacementId: string;
  nomEmplacement: string;
  auteur: string | null;
}

export interface FiltreMouvements {
  page?: number;
  pageSize?: number;
  type?: string;
  varianteId?: string;
  emplacementId?: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface IAlerteLigneStock {
  variantId: string;
  sku: string;
  nomProduit: string;
  nomVariante: string | null;
  typeProduit: string;
  quantite: number;
  estRupture: boolean;
}

export interface IAlerteStockDetail {
  nbRuptures: number;
  nbAlertes: number;
  total: number;
  lignes: IAlerteLigneStock[];
  nbExpires: number;
  nbBientotPerimes: number;
  totalPeremption: number;
  lotsPeremption: IAlerteLotPeremption[];
}

export interface IAlerteLotPeremption {
  batchId: string;
  variantId: string;
  batchNumber: string;
  expiryDate: string;
  joursRestants: number;
  quantiteRestante: number;
  sku: string;
  nomProduit: string;
  nomVariante: string | null;
  estExpire: boolean;
}
