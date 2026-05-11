import type { IIngredient, IStockIngredient } from "../types/ingredient.type";

export interface LigneStockIngredient {
  ingredient: IIngredient;
  quantite: number;
  enAlerte: boolean;
  valeur: number;
}

export interface KpiStockIngredient {
  valeurTotale: number;
  nbIngredients: number;
  nbAlertes: number;
  nbRuptures: number;
}

/**
 * Fusionne la fiche ingredient (prix, seuil) avec le stock par emplacement
 * pour produire la liste enrichie consommee par le tableau et les KPIs.
 */
export function fusionnerStockIngredients(
  ingredients: IIngredient[],
  stockIng: IStockIngredient[],
): LigneStockIngredient[] {
  const map = new Map(stockIng.map((s) => [s.ingredientId, s]));
  return ingredients.map((i) => {
    const s = map.get(i.id);
    const quantite = s?.quantite ?? 0;
    const enAlerte = s?.enAlerte ?? (i.seuilAlerte > 0 && quantite <= i.seuilAlerte);
    return { ingredient: i, quantite, enAlerte, valeur: quantite * (i.prixUnitaire || 0) };
  });
}

export function calculerKpisIngredients(lignes: LigneStockIngredient[]): KpiStockIngredient {
  let valeurTotale = 0;
  let nbAlertes = 0;
  let nbRuptures = 0;
  for (const l of lignes) {
    valeurTotale += l.valeur;
    if (l.quantite <= 0) nbRuptures += 1;
    else if (l.enAlerte) nbAlertes += 1;
  }
  return { valeurTotale, nbIngredients: lignes.length, nbAlertes, nbRuptures };
}
