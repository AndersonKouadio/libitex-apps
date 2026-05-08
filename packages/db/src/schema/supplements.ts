import {
  pgTable, uuid, varchar, text, numeric, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Catalogue independant de supplements proposes au moment de la commande.
 *
 * Volontairement decouples des produits : le client peut ajouter n'importe quel
 * supplement actif a n'importe quelle ligne de ticket. Pas de rattachement
 * obligatoire produit-par-produit (qui complexifie sans valeur ajoutee).
 */
export const supplements = pgTable("supplements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 15, scale: 2 }).notNull().default("0"),
  // 'NOURRITURE' | 'BOISSON' | 'ACCESSOIRE' | 'AUTRE' — segmente l'UI POS.
  category: varchar("category", { length: 20 }).notNull().default("AUTRE"),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_supplements_tenant").on(table.tenantId),
  index("idx_supplements_category").on(table.tenantId, table.category),
]);
