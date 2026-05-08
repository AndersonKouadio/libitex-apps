import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Repertoire de clients (CRM leger). Permet de fideliser, retrouver les
 * coordonnees et a terme rattacher l'historique d'achats. Distinct des `users`
 * qui sont les utilisateurs de l'application.
 */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_customers_tenant").on(table.tenantId),
  index("idx_customers_phone").on(table.phone),
  index("idx_customers_name").on(table.tenantId, table.firstName, table.lastName),
]);
