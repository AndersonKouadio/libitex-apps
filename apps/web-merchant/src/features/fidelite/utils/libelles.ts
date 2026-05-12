import type { ITransactionFidelite } from "../types/fidelite.type";

/**
 * Libelles francais pour les types de transaction fidelite.
 * Centralise pour eviter la divergence entre `carte-fidelite-client`,
 * historique, exports CSV futurs, etc.
 */
export const LIBELLE_TYPE_FIDELITE: Record<ITransactionFidelite["type"], string> = {
  EARN: "Gagne",
  REDEEM: "Utilise",
  ADJUST: "Ajustement",
};

/**
 * Classes Tailwind pour le badge de couleur d'une transaction. EARN=success,
 * REDEEM=danger (debit), ADJUST=muted (action manuelle neutre).
 */
export const CLASSES_TYPE_FIDELITE: Record<ITransactionFidelite["type"], string> = {
  EARN: "text-success",
  REDEEM: "text-danger",
  ADJUST: "text-muted",
};

export function libelleTypeFidelite(type: string): string {
  return LIBELLE_TYPE_FIDELITE[type as ITransactionFidelite["type"]] ?? type;
}
