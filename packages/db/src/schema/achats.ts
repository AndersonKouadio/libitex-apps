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

/**
 * Phase A.1 : categories de frais d'approche (landed cost).
 * Couvre les couts d'importation typiques pour le marche cible.
 */
export const purchaseCostCategoryEnum = pgEnum("purchase_cost_category", [
  "TRANSPORT",  // transport maritime/aerien/routier
  "CUSTOMS",    // droits de douane
  "TRANSIT",    // transitaire / dedouanement
  "INSURANCE",  // assurance marchandise
  "HANDLING",   // manutention / portuaire
  "OTHER",      // divers
]);

/**
 * Phase A.1 : methode d'allocation des frais sur les lignes.
 * QUANTITY = par quantite (simple, CdC). WEIGHT = poids. VALUE = valeur ligne.
 */
export const costsAllocationMethodEnum = pgEnum("costs_allocation_method", [
  "QUANTITY",
  "WEIGHT",
  "VALUE",
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
  /**
   * Phase A.1 : somme des frais d'approche (purchase_order_costs)
   * convertis en devise du tenant. Snapshot pour rapports.
   */
  costsTotal: numeric("costs_total", { precision: 15, scale: 2 }).notNull().default("0"),
  /**
   * Phase A.1 : total debarque = totalAmount + costsTotal. Snapshot pour
   * rapports rapides sans recalculer.
   */
  landedTotal: numeric("landed_total", { precision: 15, scale: 2 }).notNull().default("0"),
  /**
   * Phase A.1 : methode de ventilation des frais sur les lignes.
   * QUANTITY = part proportionnelle a la quantite (defaut, le plus simple).
   * WEIGHT = part proportionnelle au poids ligne (qty * weight).
   * VALUE = part proportionnelle a la valeur ligne (qty * unit_price).
   */
  costsAllocationMethod: costsAllocationMethodEnum("costs_allocation_method")
    .notNull().default("QUANTITY"),
  /**
   * Phase A.1 : devise de la commande (peut differer du tenant en import).
   * Defaut tenant.currency. Format ISO 4217 (XOF, USD, EUR, CNY).
   */
  currencyCode: varchar("currency_code", { length: 3 }),
  /**
   * Phase A.1 : taux de change fige au moment du passage DRAFT -> SENT.
   * Conversion devise commande -> devise tenant. 1.0 si meme devise.
   */
  exchangeRateAtOrder: numeric("exchange_rate_at_order", { precision: 12, scale: 6 }),
  /**
   * Phase A.1 : taux de change saisi au moment de la reception finale.
   * Sert au calcul de l'ecart de change.
   */
  exchangeRateAtReceipt: numeric("exchange_rate_at_receipt", { precision: 12, scale: 6 }),
  /**
   * Phase A.1 : ecart de change = (taux_reception - taux_commande) * total
   * en devise commande, exprime en devise tenant. Positif = gain de change,
   * negatif = perte. Calcul automatique a la reception finale.
   */
  exchangeGainLoss: numeric("exchange_gain_loss", { precision: 15, scale: 2 }).default("0"),
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
  /**
   * Phase A.1 : cout debarque unitaire calcule a la reception.
   * = unit_price + (part_frais_alloue / qty_recue).
   * 4 decimales pour precision quand un gros frais est ventile
   * sur petite quantite.
   * Initialise a unit_price avant reception (pas encore d'allocation).
   */
  landedUnitCost: numeric("landed_unit_cost", { precision: 15, scale: 4 }),
  /**
   * Phase A.1 : total debarque ligne = landed_unit_cost * quantity_ordered.
   * Snapshot pour rapports. Recalcule a chaque reception partielle.
   */
  landedTotalCost: numeric("landed_total_cost", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_purchase_order_lines_po").on(table.purchaseOrderId),
  index("idx_purchase_order_lines_variant").on(table.variantId),
]);

/**
 * Phase A.1 : frais d'approche (landed cost) par commande.
 * Une commande peut avoir N frais de differentes categories. Chaque frais
 * est saisi dans sa devise d'origine puis converti en devise tenant via
 * un taux fige (audit + transparence comptable).
 *
 * Ventilation : a la reception, le service Landed Cost repartit
 * costs_total sur chaque ligne selon costs_allocation_method.
 */
export const purchaseOrderCosts = pgTable("purchase_order_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  purchaseOrderId: uuid("purchase_order_id")
    .references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  category: purchaseCostCategoryEnum("category").notNull(),
  /** Libelle libre (ex: "Transitaire Maersk", "Droits douane CI 5%"). */
  label: varchar("label", { length: 255 }).notNull(),
  /** Montant en devise de saisie. */
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  /** Devise de saisie (ISO 4217). Defaut tenant.currency a la creation. */
  currency: varchar("currency", { length: 3 }).notNull(),
  /** Taux de change devise saisie -> devise tenant, fige a la saisie. */
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 })
    .notNull().default("1"),
  /**
   * Montant converti en devise tenant. Calcule a la saisie = amount * exchange_rate.
   * Stocke pour eviter les recalculs et figer la valeur historique.
   */
  amountInBase: numeric("amount_in_base", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_purchase_order_costs_po").on(table.purchaseOrderId),
  index("idx_purchase_order_costs_tenant").on(table.tenantId),
  index("idx_purchase_order_costs_category").on(table.tenantId, table.category),
]);
