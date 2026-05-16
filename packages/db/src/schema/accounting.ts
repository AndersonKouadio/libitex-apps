import {
  pgTable, uuid, varchar, text, date, numeric, timestamp, pgEnum, index,
} from "drizzle-orm/pg-core";

/**
 * Type comptable d'un compte selon le plan OHADA.
 * - ACTIF/PASSIF : comptes de bilan (classes 1-5)
 * - CHARGE/PRODUIT : comptes de gestion (classes 6/7)
 */
export const accountTypeEnum = pgEnum("account_type", [
  "ACTIF",
  "PASSIF",
  "CHARGE",
  "PRODUIT",
]);

/**
 * Plan comptable OHADA simplifie par tenant.
 * Seed automatique a la creation d'une boutique (~12 comptes essentiels).
 * Code = numero OHADA (411, 4457, 571, 701, etc.).
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  type: accountTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_accounts_tenant").on(table.tenantId),
  index("idx_accounts_tenant_code").on(table.tenantId, table.code),
]);

/**
 * Une ecriture comptable = un fait economique (vente, achat, paiement...).
 * Doit etre equilibree (sum debit = sum credit sur ses lignes).
 * pieceNumber est genere : VTE-2026-0001, ACH-2026-0001, etc.
 */
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  date: date("date").notNull(),
  pieceNumber: varchar("piece_number", { length: 50 }).notNull(),
  description: text("description").notNull(),
  /** Type de fait (VENTE, ACHAT, PAIEMENT, AJUSTEMENT, INVENTAIRE...). */
  referenceType: varchar("reference_type", { length: 50 }),
  /** UUID du ticket / commande / paiement source — pour tracabilite. */
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_journal_tenant").on(table.tenantId),
  index("idx_journal_tenant_date").on(table.tenantId, table.date),
  index("idx_journal_reference").on(table.referenceType, table.referenceId),
]);

/**
 * Lignes d'une ecriture : chaque ligne est soit un debit, soit un credit
 * sur un compte donne. La somme des debits doit egaler la somme des credits.
 */
export const journalLines = pgTable("journal_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  debit: numeric("debit", { precision: 15, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
}, (table) => [
  index("idx_lines_entry").on(table.entryId),
  index("idx_lines_account").on(table.accountId),
]);
