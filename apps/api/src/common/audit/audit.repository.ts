import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import { type Database, auditLogs } from "@libitex/db";

export interface AuditLogInsert {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async inserer(data: AuditLogInsert): Promise<void> {
    await this.db.insert(auditLogs).values({
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      before: data.before as any,
      after: data.after as any,
      ip: data.ip,
    });
  }

  async lister(tenantId: string, opts: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    limit: number;
    offset: number;
  }) {
    const conditions = [eq(auditLogs.tenantId, tenantId)];
    if (opts.entityType) conditions.push(eq(auditLogs.entityType, opts.entityType));
    if (opts.entityId) conditions.push(eq(auditLogs.entityId, opts.entityId));
    if (opts.userId) conditions.push(eq(auditLogs.userId, opts.userId));

    const data = await this.db.query.auditLogs.findMany({
      where: and(...conditions),
      limit: opts.limit,
      offset: opts.offset,
      orderBy: desc(auditLogs.createdAt),
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(and(...conditions));

    return { data, total: Number(countResult?.count ?? 0) };
  }
}
