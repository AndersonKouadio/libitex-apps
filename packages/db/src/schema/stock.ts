import {
  pgTable, uuid, varchar, text, numeric, boolean, timestamp, pgEnum, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { variants } from "./catalog";

// ─── Enums ───

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "STOCK_IN",
  "STOCK_OUT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ADJUSTMENT",
  "RETURN_IN",
  "DEFECTIVE_OUT",
  "WRITE_OFF",
]);

// ─── Locations ───

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("STORE"),
  address: text("address"),
  parentId: uuid("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_locations_tenant").on(table.tenantId),
]);

// ─── Stock Movements (Event Sourcing) ───

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  variantId: uuid("variant_id").references(() => variants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  // Numeric signe pour permettre les mouvements decimaux (vente au poids,
  // au metre...). Negatif pour les sorties, positif pour les entrees.
  quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  batchId: uuid("batch_id"),
  serialId: uuid("serial_id"),
  note: text("note"),
  userId: uuid("user_id").notNull(),
  eventId: uuid("event_id").notNull().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_stock_movements_tenant").on(table.tenantId),
  index("idx_stock_movements_variant").on(table.variantId),
  index("idx_stock_movements_location").on(table.locationId),
  index("idx_stock_movements_event").on(table.eventId),
  index("idx_stock_movements_created").on(table.createdAt),
]);

// NOTE: current_stock is a materialized view, created via raw SQL migration:
//
// CREATE MATERIALIZED VIEW current_stock AS
// SELECT
//   tenant_id,
//   variant_id,
//   location_id,
//   SUM(quantity) AS quantity
// FROM stock_movements
// GROUP BY tenant_id, variant_id, location_id;
//
// CREATE UNIQUE INDEX idx_current_stock_lookup
//   ON current_stock (tenant_id, variant_id, location_id);

