export type UniteIngredient = "G" | "KG" | "ML" | "L" | "PIECE";

export interface IIngredient {
  id: string;
  nom: string;
  description: string | null;
  unite: UniteIngredient;
  prixUnitaire: number;
  seuilAlerte: number;
  actif: boolean;
  creeLe: string;
}

export interface IStockIngredient {
  ingredientId: string;
  nomIngredient: string;
  unite: UniteIngredient;
  emplacementId: string;
  quantite: number;
  enAlerte: boolean;
}

export interface ILigneRecette {
  id: string;
  ingredientId: string;
  nomIngredient: string;
  quantite: number;
  unite: UniteIngredient;
  ordre: number;
}

export const UNITE_LABELS: Record<UniteIngredient, string> = {
  G: "g",
  KG: "kg",
  ML: "mL",
  L: "L",
  PIECE: "pièce",
};

export const UNITES_ORDONNEES: UniteIngredient[] = ["KG", "G", "L", "ML", "PIECE"];
