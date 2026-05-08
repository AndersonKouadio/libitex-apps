import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum,
  numeric, integer, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { locations } from "./stock";
import { variants } from "./catalog";
import { users } from "./users";
import { uniteMesureEnum } from "./_shared";

// ─── Enums ───

export const ingredientMovementTypeEnum = pgEnum("ingredient_movement_type", [
  "STOCK_IN",       // reception
  "CONSUMPTION",    // consommee par une vente menu
  "ADJUSTMENT",     // correction d'inventaire
  "WASTE",          // perte / casse / peremption
  "TRANSFER_IN",
  "TRANSFER_OUT",
]);

// ─── Ingredients (matieres premieres) ───

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  unit: uniteMesureEnum("unit").notNull(),
  // Coût d'achat moyen pour 1 unité (1 kg, 1 L, 1 piece...)
  pricePerUnit: numeric("price_per_unit", { precision: 15, scale: 4 }).default("0"),
  // Niveau d'alerte stock bas
  lowStockThreshold: numeric("low_stock_threshold", { precision: 15, scale: 3 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_ingredients_tenant").on(table.tenantId),
  index("idx_ingredients_name").on(table.tenantId, table.name),
]);

// ─── Stock d'ingredients par emplacement ───

export const ingredientInventory = pgTable("ingredient_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  ingredientId: uuid("ingredient_id").references(() => ingredients.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  // Numeric pour gerer les decimales (ex: 250.5 g)
  quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ingredient_inventory").on(table.tenantId, table.ingredientId, table.locationId),
]);

// ─── Mouvements de stock d'ingredients (event-sourcing) ───

export const ingredientMovements = pgTable("ingredient_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  ingredientId: uuid("ingredient_id").references(() => ingredients.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  type: ingredientMovementTypeEnum("type").notNull(),
  // Quantite signee: negatif pour les sorties, positif pour les entrees
  quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: uniteMesureEnum("unit").notNull(),
  // Cout unitaire au moment du mouvement (FIFO/moyenne ponderee)
  unitCost: numeric("unit_cost", { precision: 15, scale: 4 }),
  reference: varchar("reference", { length: 255 }), // numero ticket, reference fournisseur...
  note: text("note"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ingredient_movements_tenant").on(table.tenantId),
  index("idx_ingredient_movements_ingredient").on(table.ingredientId, table.createdAt),
  index("idx_ingredient_movements_location").on(table.locationId, table.createdAt),
]);

// ─── Recettes : composition d'un menu (MENU product) ───
//
// Une variante de produit MENU a N lignes de recette qui consomment
// des ingredients selon une quantite et une unite. A la vente, le stock
// des ingredients est decremente automatiquement.

export const recipeLines = pgTable("recipe_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id").references(() => variants.id, { onDelete: "cascade" }).notNull(),
  ingredientId: uuid("ingredient_id").references(() => ingredients.id).notNull(),
  // Quantite consommee pour 1 vente du menu (ex: 0.250 kg de farine)
  quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: uniteMesureEnum("unit").notNull(),
  // Position dans la liste (ordre d'affichage)
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_recipe_lines_variant").on(table.variantId, table.sortOrder),
  index("idx_recipe_lines_ingredient").on(table.ingredientId),
]);
