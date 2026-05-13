import {
  pgTable, uuid, varchar, text, numeric, boolean, timestamp, jsonb,
  index, unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { locations } from "./stock";

/**
 * Module 15 D1 : preferences par emplacement.
 *
 * Permet a un commercant multi-emplacements (boutique + camion + stand)
 * d'avoir des reglages distincts par site sans tout dupliquer au niveau
 * tenant. Tous les champs sont des OVERRIDES : null = on herite des
 * defauts tenant.
 *
 * Cas d'usage :
 * - Boutique 1 dans une zone export-libre -> TVA 0% (override taxRate)
 * - Camion accepte seulement especes + Mobile Money (override paymentMethods)
 * - Restaurant veut afficher "Merci de votre visite !" en bas de ticket
 *   (ticketFooterMessage)
 * - Camion utilise une imprimante Bluetooth specifique, pas la USB de la
 *   boutique (preferredPrinterSignature)
 *
 * Une seule ligne par locationId (unique). Cree a la demande la premiere
 * fois qu'on modifie un parametre — sinon la location herite tout du tenant.
 */
export const locationSettings = pgTable("location_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),

  /**
   * Module 15 D2 : override taxRate du tenant. Null = herite tenant.taxRate.
   * Format string pour preserver la precision decimale (ex "18.5").
   */
  taxRateOverride: numeric("tax_rate_override", { precision: 5, scale: 2 }),

  /**
   * Override methodes de paiement. Null = herite tenant.paymentMethods.
   * Array vide [] = aucune methode disponible (cas peu probable mais legal).
   * Format identique a tenants.payment_methods.
   */
  paymentMethodsOverride: jsonb("payment_methods_override")
    .$type<Array<"CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT">>(),

  /**
   * Message libre affiche en bas de ticket pour cet emplacement.
   * Ex : "Merci de votre visite ! Suivez-nous sur Instagram @maboutique"
   * Max 200 chars (3-4 lignes thermique 80mm).
   */
  ticketFooterMessage: varchar("ticket_footer_message", { length: 200 }),

  /**
   * Default suggere pour l'impression auto a cet emplacement. Le
   * caissier peut overrider en local (localStorage), mais ce default
   * s'applique a chaque nouvelle session sur un device frais.
   */
  autoPrintDefault: boolean("auto_print_default").notNull().default(false),

  /**
   * Signature d'imprimante preferee (vendorId:productId pour USB,
   * nameDevice pour Bluetooth). Permet de suggester quelle imprimante
   * appairer quand le caissier ouvre /parametres/imprimante depuis
   * cette location. Pas de contrainte forte — informatif uniquement.
   */
  preferredPrinterSignature: varchar("preferred_printer_signature", { length: 100 }),

  /** Notes libres pour l'admin (ex: "Imprimante BT au comptoir 2"). */
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_location_settings_tenant").on(table.tenantId),
  // Une seule ligne par location (la creation est lazy au 1er override)
  unique("uq_location_settings_location").on(table.locationId),
]);
