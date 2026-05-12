import {
  pgTable, uuid, varchar, text, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Module 10 D1 : journal des notifications envoyees (WhatsApp, email, SMS).
 * Permet :
 * - Audit : qui a recu quoi, quand
 * - Debug : pourquoi un envoi a echoue (erreur API, telephone invalide)
 * - Retry : retrouver les pending pour les rejouer
 * - Throttle : eviter de spam un client (compter envois par jour)
 *
 * Pas de FK vers customers/reservations : on garde l'`entityType + entityId`
 * pour pouvoir loguer des envois lies a des entites variees sans casser
 * en cas de suppression (et on snapshot le destinataire au moment de l'envoi).
 */
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  /** Canal d'envoi : 'whatsapp' | 'email' | 'sms'. */
  channel: varchar("channel", { length: 20 }).notNull(),
  /** Type metier : 'ticket' | 'reservation_created' | 'reservation_reminder' |
   *  'reservation_status' | 'purchase_order' | 'promo' | 'stock_alert' | 'otp'. */
  type: varchar("type", { length: 50 }).notNull(),
  /** Destinataire au moment de l'envoi (telephone ou email). Snapshot. */
  recipient: varchar("recipient", { length: 255 }).notNull(),
  /** 'pending' | 'sent' | 'delivered' | 'read' | 'failed'. Mis a jour
   *  par les webhooks du provider quand dispo. */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  /** Type d'entite source (TICKET, RESERVATION, PURCHASE_ORDER...) pour audit. */
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  /** Contenu envoye + parametres template (pour replay/debug). */
  payload: jsonb("payload"),
  /** Message d'erreur si status = 'failed'. */
  error: text("error"),
  /** ID retourne par le provider (Meta message ID, Twilio SID...). */
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => [
  index("idx_notif_logs_tenant").on(table.tenantId),
  index("idx_notif_logs_status").on(table.tenantId, table.status),
  index("idx_notif_logs_recipient").on(table.tenantId, table.recipient),
  index("idx_notif_logs_entity").on(table.entityType, table.entityId),
  index("idx_notif_logs_created").on(table.createdAt),
]);
