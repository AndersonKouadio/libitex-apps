/**
 * Plan comptable OHADA simplifie pour commerce de detail.
 *
 * Source : SYSCOHADA revise (acte uniforme 2017). Classes 1-9.
 * On ne seed que les comptes effectivement utilises par les ecritures
 * automatiques generees par les services (vente, achat, paiement, stock).
 *
 * Le commercant peut ajouter d'autres comptes manuellement plus tard.
 */

export type TypeCompte = "ACTIF" | "PASSIF" | "CHARGE" | "PRODUIT";

export interface CompteOhada {
  code: string;
  label: string;
  type: TypeCompte;
}

export const PLAN_COMPTABLE_OHADA: readonly CompteOhada[] = [
  // ─── Classe 3 — Stocks ────────────────────────────────────────
  { code: "311", label: "Marchandises", type: "ACTIF" },

  // ─── Classe 4 — Tiers ─────────────────────────────────────────
  { code: "401", label: "Fournisseurs, dettes en compte", type: "PASSIF" },
  { code: "411", label: "Clients", type: "ACTIF" },
  { code: "4456", label: "TVA déductible", type: "ACTIF" },
  { code: "4457", label: "TVA collectée", type: "PASSIF" },

  // ─── Classe 5 — Tresorerie ────────────────────────────────────
  { code: "521", label: "Banques", type: "ACTIF" },
  { code: "5712", label: "Caisse centrale", type: "ACTIF" },
  { code: "5715", label: "Mobile Money (Wave, Orange Money...)", type: "ACTIF" },

  // ─── Classe 6 — Charges ───────────────────────────────────────
  { code: "601", label: "Achats de marchandises", type: "CHARGE" },
  { code: "6019", label: "Rabais, remises et ristournes obtenus", type: "CHARGE" },

  // ─── Classe 7 — Produits ──────────────────────────────────────
  { code: "701", label: "Ventes de marchandises", type: "PRODUIT" },
  { code: "7019", label: "Rabais, remises et ristournes accordés", type: "PRODUIT" },
];

/**
 * Mapping methode de paiement POS -> code OHADA du compte de tresorerie.
 * Si une nouvelle methode est ajoutee, mettre a jour cette table.
 */
export const COMPTE_PAR_METHODE_PAIEMENT: Record<string, string> = {
  CASH: "5712",          // Especes -> Caisse
  CARD: "521",           // Carte bancaire -> Banque
  BANK_TRANSFER: "521",  // Virement bancaire -> Banque
  MOBILE_MONEY: "5715",  // Wave / Orange Money -> Mobile Money
  CREDIT: "411",         // Vente a credit -> Clients
};
