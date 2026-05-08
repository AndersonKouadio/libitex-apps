import {
  UniteMesure,
  UniteCategorie,
  UNITE_CATEGORIE,
  UNITE_LABELS,
  UNITES_PAR_CATEGORIE,
  uniteAccepteDecimal,
} from "../types/unite.type";

/**
 * Liste ordonnee des unites a afficher dans un selecteur "complet"
 * (toutes categories confondues), groupees par categorie pour la lisibilite.
 */
export const UNITES_ORDONNEES: readonly UniteMesure[] = [
  ...UNITES_PAR_CATEGORIE[UniteCategorie.UNITAIRE],
  ...UNITES_PAR_CATEGORIE[UniteCategorie.POIDS],
  ...UNITES_PAR_CATEGORIE[UniteCategorie.VOLUME],
  ...UNITES_PAR_CATEGORIE[UniteCategorie.LONGUEUR],
];

/** Libelle d'une categorie (pour les groupes du Select). */
export const CATEGORIE_LABELS: Record<UniteCategorie, string> = {
  [UniteCategorie.UNITAIRE]: "À l'unité",
  [UniteCategorie.POIDS]: "Au poids",
  [UniteCategorie.VOLUME]: "Au volume",
  [UniteCategorie.LONGUEUR]: "À la longueur",
};

/**
 * Pas par defaut suggere quand l'utilisateur active le mode "prix par unite"
 * et choisit une unite continue. Aligne avec ce que les marchands attendent
 * sur le terrain (vente au demi-kilo, au demi-litre, au 5 cm).
 */
export const PAS_PAR_DEFAUT: Partial<Record<UniteMesure, number>> = {
  [UniteMesure.KG]: 0.1,
  [UniteMesure.G]: 50,
  [UniteMesure.L]: 0.25,
  [UniteMesure.ML]: 50,
  [UniteMesure.M]: 0.1,
  [UniteMesure.CM]: 5,
};

/**
 * Construit le libelle d'un prix selon que la variante est vendue au forfait
 * ou par unite. Ex: "1 500 F" ou "1 500 F / kg".
 */
export function formaterPrix(
  montant: number,
  unite: UniteMesure,
  prixParUnite: boolean,
  devise = "F",
): string {
  const arrondi = new Intl.NumberFormat("fr-FR").format(Math.round(montant));
  if (!prixParUnite) return `${arrondi} ${devise}`;
  return `${arrondi} ${devise} / ${UNITE_LABELS[unite]}`;
}

/**
 * Verifie qu'une quantite saisie respecte le pas minimum d'une variante.
 * Si pasMin est null (cas typique des unites UNITAIRE), on exige un entier.
 * Tolerance 1e-9 pour absorber les imprecisions binaires de Number.
 */
export function quantiteValide(
  quantite: number,
  unite: UniteMesure,
  pasMin: number | null,
): boolean {
  if (quantite <= 0) return false;
  if (!uniteAccepteDecimal(unite)) {
    return Math.abs(quantite - Math.round(quantite)) < 1e-9;
  }
  if (!pasMin || pasMin <= 0) return true;
  const ratio = quantite / pasMin;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9;
}

/**
 * Aligne une quantite sur le pas minimum (en arrondissant au plus proche).
 * Sert a stabiliser l'incrementation au POS pour eviter 1.0999999 etc.
 */
export function arrondirAuPas(quantite: number, pasMin: number | null): number {
  if (!pasMin || pasMin <= 0) return quantite;
  const ratio = Math.round(quantite / pasMin);
  // Limite la precision a 3 decimales pour matcher la colonne numeric(15, 3).
  return Number((ratio * pasMin).toFixed(3));
}

/** Re-export pour ergonomie d'import. */
export { UNITE_CATEGORIE, UNITE_LABELS, uniteAccepteDecimal };
