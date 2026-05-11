import type { UniteMesure } from "@/features/unite/types/unite.type";

/**
 * @deprecated Utiliser UniteMesure depuis @/features/unite. Cet alias sera
 * supprime apres migration des consommateurs en place.
 */
export type UniteIngredient = UniteMesure;

export interface IIngredient {
  id: string;
  nom: string;
  description: string | null;
  unite: UniteMesure;
  prixUnitaire: number;
  seuilAlerte: number;
  actif: boolean;
  creeLe: string;
}

export interface IStockIngredient {
  ingredientId: string;
  nomIngredient: string;
  unite: UniteMesure;
  emplacementId: string;
  quantite: number;
  enAlerte: boolean;
}

export interface ILigneRecette {
  id: string;
  ingredientId: string;
  nomIngredient: string;
  quantite: number;
  unite: UniteMesure;
  ordre: number;
}

export type TypeMouvementIngredient =
  | "STOCK_IN" | "CONSUMPTION" | "ADJUSTMENT" | "WASTE" | "TRANSFER_IN" | "TRANSFER_OUT";

export interface IMouvementIngredient {
  id: string;
  type: TypeMouvementIngredient;
  quantite: number;
  unite: UniteMesure;
  note: string | null;
  reference: string | null;
  creeLe: string;
  ingredientId: string;
  nomIngredient: string;
  emplacementId: string;
  nomEmplacement: string;
  auteur: string | null;
}

export interface FiltreMouvementsIngredients {
  page?: number;
  pageSize?: number;
  type?: string;
  ingredientId?: string;
  emplacementId?: string;
  dateDebut?: string;
  dateFin?: string;
}
