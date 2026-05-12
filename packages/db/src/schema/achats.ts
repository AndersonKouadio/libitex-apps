import {
  pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { variants } from "./catalog";
import { locations } from "./stock";
import { users } from "./users";

// ─── Enums ──────────────────────────────────────────────────────────────

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "DRAFT",      // brouillon, modifiable
  "SENT",       // envoyee au fournisseur, attend reception
  "PARTIAL",    // partiellement recue
  "RECEIVED",   // totalement recue
  "CANCELLED",  // annulee
]);

// ─── Suppliers (Fournisseurs) ───────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  /** Conditions de paiement (ex: "30 jours fin de mois"). Texte libre. */
  paymentTerms: varchar("payment_terms", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_suppliers_tenant").on(table.tenantId),
  index("idx_suppliers_name").on(table.tenantId, table.name),
]);

// ─── Purchase Orders (Bons de commande) ─────────────────────────────────

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  /** Numero lisible : BC-20260512-001 (sequentiel par tenant + jour). */
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id).notNull(),
  /** Emplacement de livraison (entrepot / boutique). */
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  status: purchaseOrderStatusEnum("status").notNull().default("DRAFT"),
  /** Total HT calcule a partir des lignes. Stocke en snapshot pour rapports. */
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  /** Date prevue de livraison (saisie par l'acheteur). */
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  /** Date de premiere reception (PARTIAL ou RECEIVED). */
  receivedAt: timestamp("received_at", { withTimezone: true }),
  /** Notes internes sur la commande. */
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Fix C6 : soft-delete des commandes annulees pour ne pas polluer la
   *  liste active. L'historique reste consultable via filtre dedie. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_purchase_orders_tenant").on(table.tenantId),
  index("idx_purchase_orders_supplier").on(table.supplierId),
  index("idx_purchase_orders_status").on(table.tenantId, table.status),
  // Fix C4 : UNIQUE par (tenantId, orderNumber) — empeche le doublon en
  // cas de race condition a la creation. Combine avec le retry-on-conflict
  // cote repository pour serialiser les generations simultanees.
  uniqueIndex("idx_purchase_orders_number").on(table.tenantId, table.orderNumber),
]);

// ─── Purchase Order Lines (Lignes de commande) ──────────────────────────

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  variantId: uuid("variant_id").references(() => variants.id).notNull(),
  /** Quantite commandee. */
  quantityOrdered: numeric("quantity_ordered", { precision: 15, scale: 3 }).notNull(),
  /** Quantite deja recue (cumulee sur les receptions successives). */
  quantityReceived: numeric("quantity_received", { precision: 15, scale: 3 }).notNull().default("0"),
  /** Prix d'achat unitaire negocie sur cette commande. */
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  /** Total ligne = quantityOrdered * unitPrice. Snapshot. */
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_purchase_order_lines_po").on(table.purchaseOrderId),
  index("idx_purchase_order_lines_variant").on(table.variantId),
]);
