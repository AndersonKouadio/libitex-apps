export type CanalNotification = "whatsapp" | "email" | "sms";

export type TypeNotification =
  | "ticket"
  | "reservation_created"
  | "reservation_reminder"
  | "reservation_status"
  | "purchase_order"
  | "promo"
  | "stock_alert"
  | "otp";

export type StatutNotification = "pending" | "sent" | "delivered" | "read" | "failed";

export interface INotificationLog {
  id: string;
  tenantId: string;
  channel: CanalNotification;
  type: TypeNotification;
  recipient: string;
  status: StatutNotification;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  error: string | null;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface IStatutProvider {
  canal: CanalNotification;
  disponible: boolean;
  provider: string;
}

export interface IStatutProviders {
  whatsapp: IStatutProvider;
  email: IStatutProvider;
}
