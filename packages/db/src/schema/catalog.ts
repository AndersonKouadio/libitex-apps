import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum,
  integer, numeric, jsonb, date, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { uniteMesureEnum } from "./_shared";

// ─── Enums ───

export const productTypeEnum = pgEnum("product_type", [
  "SIMPLE",
  "VARIANT",
  "SERIALIZED",
  "PERISHABLE",
  "MENU",
]);

export const serialStatusEnum = pgEnum("serial_status", [
  "IN_STOCK",
  "SOLD",
  "RETURNED",
  "DEFECTIVE",
]);

// ─── Categories ───

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_categories_tenant").on(table.tenantId),
]);

// ─── Products ───

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  productType: productTypeEnum("product_type").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  brand: varchar("brand", { length: 255 }),
  barcodeEan13: varchar("barcode_ean13", { length: 13 }),
  barcodeInternal: varchar("barcode_internal", { length: 50 }),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  weight: numeric("weight", { precision: 10, scale: 3 }),
  images: jsonb("images").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_products_tenant").on(table.tenantId),
  index("idx_products_type").on(table.tenantId, table.productType),
  index("idx_products_barcode").on(table.barcodeEan13),
  index("idx_products_barcode_internal").on(table.barcodeInternal),
]);

// ─── Variants (SKU) ───

export const variants = pgTable("variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 500 }),
  attributes: jsonb("attributes").$type<Record<string, string>>().default({}),
  barcode: varchar("barcode", { length: 50 }),
  pricePurchase: numeric("price_purchase", { precision: 15, scale: 2 }).default("0"),
  priceLanded: numeric("price_landed", { precision: 15, scale: 2 }).default("0"),
  priceRetail: numeric("price_retail", { precision: 15, scale: 2 }).notNull(),
  priceWholesale: numeric("price_wholesale", { precision: 15, scale: 2 }),
  priceVip: numeric("price_vip", { precision: 15, scale: 2 }),
  weight: numeric("weight", { precision: 10, scale: 3 }),
  // Unite de vente (defaut: PIECE pour rester compatible avec l'existant).
  // Quincaillerie -> M / CM, alimentaire vrac -> KG / G, boissons en vrac -> L / ML.
  saleUnit: uniteMesureEnum("sale_unit").notNull().default("PIECE"),
  // Pas minimum pour la saisie au POS (ex: 0.1 kg, 5 cm, 0.5 m).
  // Null = entiers seulement (cas typique des unites UNITAIRE).
  saleStep: numeric("sale_step", { precision: 10, scale: 3 }),
  // Si true, priceRetail est le prix par unite de mesure (au kg, au metre).
  // Si false, prix forfaitaire pour 1 piece/lot/douzaine.
  pricePerUnit: boolean("price_per_unit").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_variants_product").on(table.productId),
  index("idx_variants_sku").on(table.sku),
  index("idx_variants_barcode").on(table.barcode),
]);

// ─── Batches (Perishable Products) ───

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id").references(() => variants.id).notNull(),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  expiryDate: date("expiry_date").notNull(),
  quantityRemaining: integer("quantity_remaining").notNull().default(0),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_batches_variant").on(table.variantId),
  index("idx_batches_expiry").on(table.expiryDate),
]);

// ─── Serials (Serialized Products) ───

export const serials = pgTable("serials", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id").references(() => variants.id).notNull(),
  serialNumber: varchar("serial_number", { length: 255 }).notNull(),
  status: serialStatusEnum("status").notNull().default("IN_STOCK"),
  purchaseOrderId: uuid("purchase_order_id"),
  saleId: uuid("sale_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_serials_variant").on(table.variantId),
  index("idx_serials_number").on(table.serialNumber),
  index("idx_serials_status").on(table.status),
]);
