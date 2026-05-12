import { formatMontant } from "@/features/vente/utils/format";

/**
 * Formate un prix avec sa devise (suffixe par convention LIBITEX).
 * Fix m4 Module 7 : centralise le pattern "1 500 F" pour eviter la
 * dispersion entre cartes, detail produit et headers.
 *
 * Exemple :
 *   formatPrix(1500, "F CFA") -> "1 500 F CFA"
 *   formatPrix(2500, "EUR")   -> "2 500 EUR"
 */
export function formatPrix(montant: number, devise: string): string {
  return `${formatMontant(montant)} ${devise}`;
}
