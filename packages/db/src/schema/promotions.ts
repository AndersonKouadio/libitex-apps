import {
  pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, pgEnum, index, unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { customers } from "./customers";
import { tickets } from "./pos";

// ─── Enums ──────────────────────────────────────────────────────────────

export const promotionTypeEnum = pgEnum("promotion_type", [
  "PERCENTAGE", // ex: 10% de remise
  "FIXED_AMOUNT", // ex: 1000 F de remise
]);

// ─── Promotions (codes promo) ───────────────────────────────────────────

/**
 * Code promo activable au moment de l'encaissement (POS ou e-commerce).
 * Le caissier saisit le code dans le panier -> validation -> application
 * de la remise globale du ticket.
 *
 * Conditions cumulables : montant min du ticket + plage de validite +
 * limite globale + limite par client.
 */
export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  /** Code saisi par le caissier (ex: RENTREE10). Insensible a la casse. */
  code: varchar("code", { length: 50 }).notNull(),
  /** Description interne (pas montree au caissier en POS, utile admin). */
  description: text("description"),
  type: promotionTypeEnum("type").notNull(),
  /**
   * Pour PERCENTAGE : valeur en pourcent (10 = 10%).
   * Pour FIXED_AMOUNT : valeur en F CFA.
   */
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  /** Montant minimum du ticket pour activer la promo. 0 = pas de minimum. */
  minPurchaseAmount: numeric("min_purchase_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Plafond de remise pour PERCENTAGE (ex: 10% mais max 5000 F). Null = pas de plafond. */
  maxDiscountAmount: numeric("max_discount_amount", { precision: 15, scale: 2 }),
  /** Plage de validite. validFrom null = depuis toujours. validTo null = jusqu'a desactivation. */
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  /** Nombre maximum d'utilisations totales. Null = illimite. */
  usageLimit: integer("usage_limit"),
  /** Compteur incremente a chaque utilisation. Permet le check vs usageLimit. */
  usageCount: integer("usage_count").notNull().default(0),
  /** Limite par client. Null = illimite. */
  perCustomerLimit: integer("per_customer_limit"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_promotions_tenant").on(table.tenantId),
  // Unicite du code par tenant (case-insensitive cote service via UPPER()).
  unique("uq_promotions_tenant_code").on(table.tenantId, table.code),
]);

// ─── Promotion Usages (traçabilite) ─────────────────────────────────────

/**
 * Enregistre chaque application d'une promo a un ticket. Sert au check
 * perCustomerLimit + audit + rapport business.
 */
export const promotionUsages = pgTable("promotion_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  promotionId: uuid("promotion_id").references(() => promotions.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  ticketId: uuid("ticket_id").references(() => tickets.id),
  /** Montant exact de la remise calculee a ce moment-la. Snapshot. */
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_promotion_usages_promo").on(table.promotionId),
  index("idx_promotion_usages_customer").on(table.customerId),
  index("idx_promotion_usages_ticket").on(table.ticketId),
]);
