import type { MethodeAllocation } from "../types/achat.type";

/**
 * Phase A.4 : helpers frontend pour preview de l'impact d'une reception
 * sur le CUMP. Miroir simplifie du LandedCostService backend.
 *
 * Algorithme :
 *   1. Calcul du denominateur selon methode (QUANTITY / VALUE)
 *      (WEIGHT non supporte cote front — pas de poids dans les lignes ici)
 *   2. Repartition des frais : frais_ligne = frais_total * part_ligne
 *   3. landed_unit = prix_unit + (frais_ligne / qty_recue)
 *   4. nouveau_cump = (stock_avant * cump_actuel + qty * landed) / (stock_avant + qty)
 *
 * Resultat est purement indicatif — le backend recalcule au moment de
 * la validation et c'est le seul reference legale.
 */
export interface LignePreview {
  ligneId: string;
  prixUnitaire: number;
  quantiteRecue: number;
  cumpActuel: number;
  /** Stock dans l'emplacement de la commande, avant cette reception. */
  stockAvant: number;
}

export interface ResultatPreview {
  ligneId: string;
  /** Frais alloues a cette ligne (en devise tenant). */
  fraisAlloue: number;
  /** Cout debarque unitaire predit (prix + frais/unite). */
  landedUnitCost: number;
  /** Nouveau CUMP predit apres reception. */
  nouveauCump: number;
  /** Delta = nouveauCump - cumpActuel. */
  deltaCump: number;
  /** Pourcentage de variation. null si cumpActuel = 0. */
  variationPct: number | null;
}

export function preview(
  lignes: LignePreview[],
  fraisTotal: number,
  methode: MethodeAllocation = "QUANTITY",
): ResultatPreview[] {
  if (lignes.length === 0) return [];

  // Filtrer les lignes avec qty > 0 (sinon pas de reception)
  const lignesActives = lignes.filter((l) => l.quantiteRecue > 0);

  // Calcul du denominateur par ligne
  const denominateurs = lignesActives.map((l) =>
    methode === "VALUE" ? l.quantiteRecue * l.prixUnitaire : l.quantiteRecue,
  );
  const sommeDenoms = denominateurs.reduce((s, d) => s + d, 0);

  return lignes.map((l) => {
    if (l.quantiteRecue <= 0) {
      return {
        ligneId: l.ligneId,
        fraisAlloue: 0,
        landedUnitCost: l.prixUnitaire,
        nouveauCump: l.cumpActuel,
        deltaCump: 0,
        variationPct: 0,
      };
    }
    const idx = lignesActives.findIndex((la) => la.ligneId === l.ligneId);
    const denom = denominateurs[idx] ?? 0;
    const partAllouee = sommeDenoms > 0 ? denom / sommeDenoms : 0;
    const fraisAlloue = fraisTotal * partAllouee;
    const fraisParUnite = fraisAlloue / l.quantiteRecue;
    const landedUnitCost = l.prixUnitaire + fraisParUnite;

    const stockSafe = Math.max(0, l.stockAvant);
    const denomCump = stockSafe + l.quantiteRecue;
    const nouveauCump =
      denomCump > 0
        ? (stockSafe * l.cumpActuel + l.quantiteRecue * landedUnitCost) / denomCump
        : l.cumpActuel;
    const deltaCump = nouveauCump - l.cumpActuel;
    const variationPct =
      l.cumpActuel > 0 ? Math.round((deltaCump / l.cumpActuel) * 100) : null;

    return {
      ligneId: l.ligneId,
      fraisAlloue: Math.round(fraisAlloue * 100) / 100,
      landedUnitCost: Math.round(landedUnitCost * 100) / 100,
      nouveauCump: Math.round(nouveauCump * 100) / 100,
      deltaCump: Math.round(deltaCump * 100) / 100,
      variationPct,
    };
  });
}
