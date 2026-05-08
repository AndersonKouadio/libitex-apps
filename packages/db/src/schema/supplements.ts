import {
  pgTable, uuid, varchar, text, numeric, boolean, integer, timestamp, index, primaryKey,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { products } from "./catalog";

/**
 * Supplements / extras / options proposes en surcoût sur une vente.
 * Cas typique restauration : sauces, accompagnements, boissons,
 * suppléments fromage, niveau de cuisson chargeable, etc.
 *
 * Lies aux produits via `productSupplements` (N:M). Le client choisit
 * a la caisse parmi les supplements rattaches au plat.
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

export const productSupplements = pgTable("product_supplements", {
  productId: uuid("product_id").references(() => products.id).notNull(),
  supplementId: uuid("supplement_id").references(() => supplements.id).notNull(),
  // Si true, le client doit obligatoirement choisir au moins 1 de ce supplement
  // (cas typique : choix de sauce, choix d'accompagnement).
  isRequired: boolean("is_required").notNull().default(false),
  // Nombre maximal d'unites de ce supplement par ligne de ticket.
  maxQuantity: integer("max_quantity").notNull().default(1),
  // Ordre d'affichage dans la modale POS.
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.productId, table.supplementId] }),
  index("idx_product_supplements_product").on(table.productId),
]);
