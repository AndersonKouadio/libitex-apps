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
]);

// ─── Tickets (Sales) ───

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull(),
  status: ticketStatusEnum("status").notNull().default("OPEN"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  note: text("note"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tickets_tenant").on(table.tenantId),
  index("idx_tickets_location").on(table.locationId),
  index("idx_tickets_user").on(table.userId),
  index("idx_tickets_status").on(table.status),
  index("idx_tickets_number").on(table.ticketNumber),
  index("idx_tickets_created").on(table.createdAt),
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
