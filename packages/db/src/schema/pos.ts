import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum,
  integer, numeric, jsonb, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { variants } from "./catalog";
import { locations } from "./stock";

// ─── Enums ───

export const ticketStatusEnum = pgEnum("ticket_status", [
  "OPEN",
  "PARKED",
  "COMPLETED",
  "VOIDED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "MOBILE_MONEY",
  "BANK_TRANSFER",
  "CREDIT",
  "LOYALTY",
]);

export const cashSessionStatusEnum = pgEnum("cash_session_status", [
  "OPEN",
  "CLOSED",
]);

// ─── Cash Sessions (Sessions caisse) ───
// Une session = une "ouverture" de caisse par un caissier sur un emplacement.
// Tous les tickets sont rattaches a une session pour le rapport Z.
// Un caissier peut avoir au plus une session OPEN par emplacement.

export const cashSessions = pgTable("cash_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  sessionNumber: varchar("session_number", { length: 50 }).notNull(),
  status: cashSessionStatusEnum("status").notNull().default("OPEN"),
  // Fonds initiaux par methode de paiement (espèces obligatoire, autres optionnels)
  // Format: { CASH: 50000, MOBILE_MONEY: 0, CARD: 0, BANK_TRANSFER: 0 }
  openingFloat: jsonb("opening_float").notNull().default({}),
  // Theorique = openingFloat + somme des paiements de la session par methode
  closingTheoretical: jsonb("closing_theoretical"),
  // Declare = comptage saisi par le caissier a la fermeture
  closingDeclared: jsonb("closing_declared"),
  // Ecart = declared - theorical (positif = excedent, negatif = manquant)
  variance: jsonb("variance"),
  openingNote: text("opening_note"),
  closingNote: text("closing_note"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (table) => [
  index("idx_cash_sessions_tenant").on(table.tenantId),
  index("idx_cash_sessions_location").on(table.locationId),
  index("idx_cash_sessions_cashier").on(table.cashierId),
  index("idx_cash_sessions_status").on(table.status),
  index("idx_cash_sessions_opened").on(table.openedAt),
]);

// ─── Tickets (Sales) ───

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  // Session caisse a laquelle le ticket appartient. Nullable transitoirement
  // pour les tickets PARKED "reportes" entre sessions (ils flottent en
  // attendant d'etre repris par un caissier dont la session est ouverte).
  sessionId: uuid("session_id").references(() => cashSessions.id),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull(),
  status: ticketStatusEnum("status").notNull().default("OPEN"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  // Lien optionnel vers le repertoire CRM (customers). Si rempli, permet
  // l'historique d'achats. customerName/customerPhone restent en snapshot
  // au moment de la vente (les coordonnees client peuvent changer apres,
  // mais le ticket doit garder l'etat de la transaction).
  customerId: uuid("customer_id"),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  note: text("note"),
  /**
   * Module 11 D1 : raison de la remise globale en clair. Snapshot au moment
   * de la creation du ticket. Format strict pour les codes promo :
   * "PROMO:CODE" (utilise par completerTicket pour appliquer atomiquement).
   * Pour une remise manuelle libre, contient le texte saisi par le caissier.
   * Null si pas de remise.
   */
  discountReason: varchar("discount_reason", { length: 255 }),
  /**
   * Cle d'idempotence pour eviter les doublons sur les ventes offline
   * resyncees apres interruption. UUID v4 fourni par le frontend
   * (file-attente-offline). Si la cle existe deja, le backend retourne
   * le ticket existant au lieu de creer un doublon.
   * Index unique scope au tenant pour permettre la meme cle sur 2
   * tenants differents (theoriquement impossible avec UUID v4 mais
   * defense en profondeur).
   * Fix C4 du Module 2.
   */
  idempotencyKey: varchar("idempotency_key", { length: 64 }),
  /**
   * A3 — Retours/échanges POS.
   * 'SALE' (défaut) = vente normale. 'RETURN' = ticket de retour.
   * Varchar pour éviter une migration enum — les valeurs sont controlees
   * cote service.
   */
  ticketType: varchar("ticket_type", { length: 10 }).notNull().default("SALE"),
  /**
   * Lien vers le ticket de vente d'origine pour un retour (nullable).
   * Permet de tracer retour <-> vente originale.
   */
  refTicketId: uuid("ref_ticket_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tickets_tenant").on(table.tenantId),
  index("idx_tickets_location").on(table.locationId),
  index("idx_tickets_user").on(table.userId),
  index("idx_tickets_session").on(table.sessionId),
  index("idx_tickets_status").on(table.status),
  index("idx_tickets_number").on(table.ticketNumber),
  index("idx_tickets_created").on(table.createdAt),
  index("idx_tickets_customer").on(table.customerId),
  index("idx_tickets_idempotency").on(table.tenantId, table.idempotencyKey),
  index("idx_tickets_ref").on(table.refTicketId),
]);

// ─── Ticket Lines ───

export const ticketLines = pgTable("ticket_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").references(() => tickets.id).notNull(),
  variantId: uuid("variant_id").references(() => variants.id).notNull(),
  productName: varchar("product_name", { length: 500 }).notNull(),
  variantName: varchar("variant_name", { length: 500 }),
  sku: varchar("sku", { length: 100 }).notNull(),
  // Numeric pour permettre les ventes au poids/longueur/volume (ex: 1.250 kg).
  // Pour les variantes en PIECE, la quantite reste un entier en pratique.
  quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  // For SERIALIZED products
  serialNumber: varchar("serial_number", { length: 255 }),
  serialId: uuid("serial_id"),
  // For PERISHABLE products
  batchId: uuid("batch_id"),
  batchNumber: varchar("batch_number", { length: 100 }),
  // Supplements/extras choisis a la vente (stockes en JSONB pour souplesse).
  // Format : [{ supplementId, name, unitPrice, quantity }]
  supplements: jsonb("supplements")
    .$type<Array<{ supplementId: string; name: string; unitPrice: number; quantity: number }>>()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ticket_lines_ticket").on(table.ticketId),
  index("idx_ticket_lines_variant").on(table.variantId),
]);

// ─── Ticket Payments ───

export const ticketPayments = pgTable("ticket_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").references(() => tickets.id).notNull(),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ticket_payments_ticket").on(table.ticketId),
]);
