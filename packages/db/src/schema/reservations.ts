import {
  pgTable, uuid, varchar, text, integer, timestamp, pgEnum, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { customers } from "./customers";
import { locations } from "./stock";
import { users } from "./users";

export const reservationStatusEnum = pgEnum("reservation_status", [
  "PENDING",    // demandee, en attente de confirmation
  "CONFIRMED",  // confirmee par le resto
  "SEATED",     // client installe a table
  "COMPLETED",  // service termine, table liberee
  "CANCELLED",  // annulee (par le client ou le resto)
  "NO_SHOW",   // client absent
]);

/**
 * Reservation de table pour les restos. Couple optionnellement a un client
 * du CRM (customers) ou en saisie libre (nom + telephone).
 *
 * tableNumber est un texte libre (ex: "Table 4", "Terrasse 2", "Bar"). Pas
 * de gestion fine des tables physiques pour Phase 1 — l'objectif est juste
 * de tracer les reservations et leur statut, pas de plan de salle.
 */
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  /** Emplacement (restaurant) ou la reservation a lieu. */
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  /** Client lie au CRM si existant. Null = client de passage / saisie libre. */
  customerId: uuid("customer_id").references(() => customers.id),
  /** Snapshot du nom/telephone au moment de la reservation. */
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }),
  /** Texte libre — pas de plan de salle. */
  tableNumber: varchar("table_number", { length: 50 }),
  /** Date + heure d'arrivee prevue. */
  reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull(),
  /** Nombre de couverts. */
  partySize: integer("party_size").notNull().default(2),
  status: reservationStatusEnum("status").notNull().default("PENDING"),
  /** Notes : allergies, occasion speciale, demandes du client... */
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_reservations_tenant").on(table.tenantId),
  index("idx_reservations_location").on(table.locationId),
  index("idx_reservations_date").on(table.tenantId, table.reservedAt),
  index("idx_reservations_status").on(table.tenantId, table.status),
  index("idx_reservations_customer").on(table.customerId),
]);
