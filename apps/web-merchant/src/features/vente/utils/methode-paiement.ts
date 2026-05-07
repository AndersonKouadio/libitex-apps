import { Banknote, CreditCard, Smartphone, Landmark, Receipt, type LucideIcon } from "lucide-react";

export const LABELS_METHODE_PAIEMENT: Record<string, string> = {
  CASH: "Especes",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Carte bancaire",
  BANK_TRANSFER: "Virement",
  CREDIT: "Credit client",
};

export const ICONES_METHODE_PAIEMENT: Record<string, LucideIcon> = {
  CASH: Banknote,
  MOBILE_MONEY: Smartphone,
  CARD: CreditCard,
  BANK_TRANSFER: Landmark,
  CREDIT: Receipt,
};

export function libelleMethode(code: string): string {
  return LABELS_METHODE_PAIEMENT[code] ?? code;
}

export function iconeMethode(code: string): LucideIcon {
  return ICONES_METHODE_PAIEMENT[code] ?? Receipt;
}
