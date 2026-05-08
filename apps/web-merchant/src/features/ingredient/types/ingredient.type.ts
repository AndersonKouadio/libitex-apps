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
