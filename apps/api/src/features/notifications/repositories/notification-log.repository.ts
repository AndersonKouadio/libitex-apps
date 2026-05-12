import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, notificationLogs } from "@libitex/db";

export interface NotificationLogInsert {
  tenantId: string;
  channel: string;
  type: string;
  recipient: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
  error?: string;
  providerMessageId?: string;
  sentAt?: Date;
}

@Injectable()
export class NotificationLogRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async inserer(data: NotificationLogInsert): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(notificationLogs)
      .values({
        tenantId: data.tenantId,
        channel: data.channel,
        type: data.type,
        recipient: data.recipient,
        status: data.status ?? "pending",
        entityType: data.entityType,
        entityId: data.entityId,
        payload: data.payload as any,
        error: data.error,
        providerMessageId: data.providerMessageId,
        sentAt: data.sentAt,
      })
      .returning({ id: notificationLogs.id });
    return row!;
  }

  async marquerEnvoye(
    id: string,
    providerMessageId: string | undefined,
  ): Promise<void> {
    await this.db
      .update(notificationLogs)
      .set({ status: "sent", sentAt: new Date(), providerMessageId })
      .where(eq(notificationLogs.id, id));
  }

  async marquerEchoue(id: string, erreur: string): Promise<void> {
    await this.db
      .update(notificationLogs)
      .set({ status: "failed", error: erreur.slice(0, 2000) })
      .where(eq(notificationLogs.id, id));
  }

  /**
   * Liste paginee des notifications recentes d'un tenant. Utilise pour
   * la page admin (D3) et l'audit.
   */
  async lister(tenantId: string, opts: { limit?: number; offset?: number } = {}) {
    return this.db.query.notificationLogs.findMany({
      where: eq(notificationLogs.tenantId, tenantId),
      limit: opts.limit ?? 30,
      offset: opts.offset ?? 0,
      orderBy: desc(notificationLogs.createdAt),
    });
  }

  /**
   * Anti-doublon : verifie si une notification du meme type pour la
   * meme entite a deja ete envoyee. Utile pour eviter de spammer un
   * client si le hook se declenche 2x (ex. retry mutation).
   */
  async dejaEnvoye(
    tenantId: string,
    type: string,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const existant = await this.db.query.notificationLogs.findFirst({
      where: and(
        eq(notificationLogs.tenantId, tenantId),
        eq(notificationLogs.type, type),
        eq(notificationLogs.entityType, entityType),
        eq(notificationLogs.entityId, entityId),
      ),
    });
    return Boolean(existant);
  }
}
