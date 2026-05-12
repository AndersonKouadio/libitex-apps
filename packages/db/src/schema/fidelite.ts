import {
  pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { customers } from "./customers";
import { tickets } from "./pos";
import { users } from "./users";

// ─── Loyalty Config (1 par tenant) ───────────────────────────────────────

export const loyaltyConfig = pgTable("loyalty_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull().unique(),
  /** Programme actif sur cette boutique. */
  isActive: boolean("is_active").notNull().default(false),
  /** Nom du programme (ex: "Carte LIBITEX", "Etoiles cafe..."). */
  programName: varchar("program_name", { length: 100 }).notNull().default("Programme fidelite"),
  /**
   * Ratio gain : nombre de F CFA pour gagner 1 point. Ex: 100 => 1 point
   * tous les 100 F dépensés. Plus bas = plus genereux.
   */
  earnAmount: numeric("earn_amount", { precision: 15, scale: 2 }).notNull().default("100"),
  /**
   * Ratio conversion : 1 point = X F CFA de remise.
   * Ex: 5 => 1 point vaut 5 F. 100 points = 500 F de reduction.
   */
  redeemValue: numeric("redeem_value", { precision: 15, scale: 2 }).notNull().default("5"),
  /**
   * Minimum de points pour utiliser (palier). Ex: 100 = pas d'utilisation
   * en dessous de 100 points.
   */
  minRedeemPoints: integer("min_redeem_points").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Loyalty Transactions (event-sourced) ───────────────────────────────

export const loyaltyTransactionTypeEnum = pgEnum("loyalty_transaction_type", [
  "EARN",      // gain de points lie a un ticket
  "REDEEM",    // utilisation de points (paiement avec remise)
  "ADJUST",    // ajustement manuel par un admin (+/- libre)
]);

/**
 * Solde d'un client = SUM(points) sur toutes ses transactions. Pattern
 * event-sourced comme stock_movements pour audit + backtrack facile.
 */
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  /** Positif pour gain/credit, negatif pour utilisation. */
  points: integer("points").notNull(),
  transactionType: loyaltyTransactionTypeEnum("transaction_type").notNull(),
  /** Ticket associe si EARN ou REDEEM. */
  ticketId: uuid("ticket_id").references(() => tickets.id),
  /** Auteur (utile pour ADJUST manuel). */
  userId: uuid("user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_loyalty_tx_tenant").on(table.tenantId),
  index("idx_loyalty_tx_customer").on(table.customerId),
  index("idx_loyalty_tx_ticket").on(table.ticketId),
  // Fix C4 : idempotence sur les transactions liees a un ticket.
  // Une meme (tenant, customer, ticket, type) ne peut etre creee qu'une
  // fois — protege contre les replays (sync offline POS, retry webhook).
  // ADJUST n'est pas borne car ticketId est nullable (non couvert par
  // l'index dans Postgres : NULL distinct par defaut).
  uniqueIndex("idx_loyalty_tx_unique").on(
    table.tenantId, table.customerId, table.ticketId, table.transactionType,
  ),
]);
