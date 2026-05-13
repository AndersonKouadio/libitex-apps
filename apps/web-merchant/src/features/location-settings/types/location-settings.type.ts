export type MethodePaiement = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT";

/**
 * Module 15 D1 : reglages bruts (overrides only). null = herite tenant.
 */
export interface ILocationSettings {
  locationId: string;
  taxRateOverride: number | null;
  paymentMethodsOverride: MethodePaiement[] | null;
  ticketFooterMessage: string | null;
  autoPrintDefault: boolean;
  preferredPrinterSignature: string | null;
  notes: string | null;
}

/**
 * Module 15 D2 : reglages effectifs (override OU defaut tenant).
 * Utilise par les services applicatifs (vente, ticket).
 */
export interface ILocationSettingsEffectifs {
  locationId: string;
  taxRate: number;
  paymentMethods: MethodePaiement[];
  ticketFooterMessage: string | null;
  autoPrintDefault: boolean;
  preferredPrinterSignature: string | null;
}
