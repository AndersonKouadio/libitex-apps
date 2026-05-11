import type { IStockEmplacement } from "../types/stock.type";

export const SEUIL_ALERTE_PAR_DEFAUT = 10;

export interface KpiStock {
  valeurTotale: number;
  totalUnites: number;
  nbAlertes: number;
  nbRuptures: number;
  nbLignes: number;
}

export function calculerKpisStock(rows: IStockEmplacement[]): KpiStock {
  let valeurTotale = 0;
  let totalUnites = 0;
  let nbAlertes = 0;
  let nbRuptures = 0;
  for (const r of rows) {
    const q = Number(r.quantite) || 0;
    const pa = Number(r.prixAchat) || 0;
    valeurTotale += q * pa;
    totalUnites += q;
    if (q <= 0) nbRuptures += 1;
    else if (q <= SEUIL_ALERTE_PAR_DEFAUT) nbAlertes += 1;
  }
  return { valeurTotale, totalUnites, nbAlertes, nbRuptures, nbLignes: rows.length };
}

export function estEnAlerte(quantite: number): "rupture" | "faible" | "ok" {
  if (quantite <= 0) return "rupture";
  if (quantite <= SEUIL_ALERTE_PAR_DEFAUT) return "faible";
  return "ok";
}

export function formatMontantXOF(valeur: number): string {
  return valeur.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}
