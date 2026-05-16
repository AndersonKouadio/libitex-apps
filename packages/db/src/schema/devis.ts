import {
  pgTable, uuid, varchar, text, numeric, timestamp, pgEnum,
  integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { variants } from "./catalog";
import { customers } from "./customers";

// ─── Enums ──────────────────────────────────────────────────────────────

/**
 * États du cycle de vie d'un devis :
 *  - DRAFT     : brouillon, modifiable, jamais envoyé au client
 *  - SENT      : envoyé au client, en attente de réponse
 *  - ACCEPTED  : client a accepté (peut être converti en facture)
 *  - REFUSED   : client a refusé (terminal)
 *  - EXPIRED   : date de validité dépassée sans réponse (terminal)
 *  - CONVERTED : converti en facture (terminal — la facture porte la vie commerciale)
 *  - CANCELLED : annulé par le marchand avant envoi ou réponse (soft cancel)
 */
export const quoteStatusEnum = pgEnum("quote_status", [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REFUSED",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
]);

// ─── Quotes (Devis) ─────────────────────────────────────────────────────
//
// Document commercial B2B remis au client avant la vente. Engage le marchand
// sur les prix, conditions et validité — pas le client. Une fois ACCEPTED,
// peut être converti en facture (qui décrémente le stock à la livraison).
//
// Distinct d'un ticket POS : pas de stock impacté, pas de paiement, peut
// rester en attente plusieurs jours/semaines.

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  /** Numéro lisible : DEV-20260516-001 (séquentiel par tenant + jour). */
  quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
  /** Client destinataire — obligatoire (B2B = client identifié). */
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  status: quoteStatusEnum("status").notNull().default("DRAFT"),

  /** Date d'émission (par défaut createdAt, peut être modifiée tant que DRAFT). */
  issueDate: timestamp("issue_date", { withTimezone: true }).notNull().defaultNow(),
  /** Date jusqu'à laquelle le devis est valide. Au-delà → EXPIRED. */
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),

  /** Total HT (somme des lignes après remise ligne). Snapshot. */
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Total TVA. Snapshot. */
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Remise globale en montant fixe (en plus des remises lignes). */
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Total TTC = subtotal + taxAmount - discountAmount. Snapshot. */
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),

  /** Conditions de paiement (texte libre : "30 jours net", "Comptant"...). */
  paymentTerms: text("payment_terms"),
  /** Conditions de livraison (texte libre : "Franco usine", "DAP Dakar"...). */
  deliveryTerms: text("delivery_terms"),
  /** Notes internes (non imprimées sur le PDF). */
  internalNotes: text("internal_notes"),
  /** Notes affichées au client sur le PDF (mentions, remerciements...). */
  customerNotes: text("customer_notes"),

  /** Trace de la conversion : facture créée à partir de ce devis. */
  convertedToInvoiceId: uuid("converted_to_invoice_id"),
  /** Trace de la conversion : date de transformation en facture. */
  convertedAt: timestamp("converted_at", { withTimezone: true }),

  /** Trace de l'envoi au client (email, lien partagé, etc.). */
  sentAt: timestamp("sent_at", { withTimezone: true }),
  /** Réponse client : date acceptation ou refus. */
  respondedAt: timestamp("responded_at", { withTimezone: true }),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Soft delete : conserve les devis annulés pour l'historique. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_quotes_tenant").on(table.tenantId),
  index("idx_quotes_customer").on(table.customerId),
  index("idx_quotes_status").on(table.tenantId, table.status),
  index("idx_quotes_valid_until").on(table.validUntil),
  // UNIQUE par (tenantId, quoteNumber) — empêche les doublons en cas de
  // race condition à la création. Combine avec retry-on-conflict côté repo.
  uniqueIndex("idx_quotes_number").on(table.tenantId, table.quoteNumber),
]);

// ─── Quote Lines (Lignes de devis) ──────────────────────────────────────

export const quoteLines = pgTable("quote_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull(),
  /** Variante du catalogue (peut être null pour ligne libre type "Forfait"). */
  variantId: uuid("variant_id").references(() => variants.id),

  /** Snapshot SKU pour traçabilité (le SKU peut changer côté catalogue). */
  sku: varchar("sku", { length: 100 }),
  /** Snapshot nom produit pour affichage et PDF (immuable même si renommé). */
  productName: varchar("product_name", { length: 255 }).notNull(),
  /** Snapshot nom variante (taille, couleur, etc.). */
  variantName: varchar("variant_name", { length: 255 }),
  /** Description longue ligne libre (optionnelle, pour lignes hors catalogue). */
  description: text("description"),

  /** Position d'affichage (1-indexed, permet réordonnement). */
  position: integer("position").notNull().default(1),

  /** Quantité — décimal pour kg/m/L. */
  quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
  /** Prix unitaire HT. */
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  /** Remise ligne en montant fixe (déjà déduite du lineSubtotal). */
  discount: numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Taux TVA appliqué (snapshot, le taux produit peut changer). 0..100 */
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),

  /** Total HT ligne = quantity * unitPrice - discount. Snapshot. */
  lineSubtotal: numeric("line_subtotal", { precision: 15, scale: 2 }).notNull(),
  /** TVA ligne = lineSubtotal * taxRate / 100. Snapshot. */
  lineTax: numeric("line_tax", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Total TTC ligne = lineSubtotal + lineTax. Snapshot. */
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_quote_lines_quote").on(table.quoteId),
  index("idx_quote_lines_variant").on(table.variantId),
]);
