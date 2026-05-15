/**
 * Phase A.4 : helpers pour le calcul de la marge reelle.
 *
 * Marge reelle = (prix_vente - CUMP) / CUMP * 100
 *
 * Le CUMP inclut TOUS les couts (achat + transport + douane + transit +
 * assurance + manutention), donc la marge calculee ici est la vraie
 * rentabilite, pas une marge brute.
 *
 * Si CUMP = 0 (variant jamais receptionne), on fallback sur prix_achat
 * pour donner une indication minimale au commercant.
 */

export interface ResultatMarge {
  /** Pourcentage entier de marge (peut etre negatif). null si base = 0. */
  pourcentage: number | null;
  /** Montant de marge unitaire (prix_vente - base). null si base = 0. */
  montant: number | null;
  /** Base utilisee : "CUMP" si CUMP > 0, sinon "PRIX_ACHAT". */
  base: "CUMP" | "PRIX_ACHAT" | "AUCUNE";
  /** Vrai si la marge est negative (vente a perte). */
  enPerte: boolean;
}

export function calculerMargeReelle(
  prixVente: number,
  cump: number,
  prixAchat: number,
): ResultatMarge {
  // Priorite au CUMP (cout debarque reel). Fallback prix_achat si pas
  // encore initialise.
  const base = cump > 0 ? cump : prixAchat > 0 ? prixAchat : 0;
  const baseSource: ResultatMarge["base"] =
    cump > 0 ? "CUMP" : prixAchat > 0 ? "PRIX_ACHAT" : "AUCUNE";

  if (base <= 0 || prixVente <= 0) {
    return { pourcentage: null, montant: null, base: baseSource, enPerte: false };
  }

  const montant = prixVente - base;
  const pourcentage = Math.round((montant / base) * 100);

  return { pourcentage, montant, base: baseSource, enPerte: montant < 0 };
}

/**
 * Classes Tailwind selon la marge. Rouge si vente a perte, jaune si
 * marge < 10%, vert sinon. Neutre si pas de base de calcul.
 */
export function classesMarge(resultat: ResultatMarge): string {
  if (resultat.pourcentage === null) return "text-muted";
  if (resultat.enPerte) return "text-danger";
  if (resultat.pourcentage < 10) return "text-warning";
  return "text-success";
}

/**
 * Libelle court pour le badge marge.
 * "+25%" / "-12%" / "—" si pas de base.
 */
export function libelleMarge(resultat: ResultatMarge): string {
  if (resultat.pourcentage === null) return "—";
  const signe = resultat.pourcentage > 0 ? "+" : "";
  return `${signe}${resultat.pourcentage}%`;
}
