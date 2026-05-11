import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, or, ilike, sql, desc } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, customers, tickets } from "@libitex/db";

interface CreerClientData {
  tenantId: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

@Injectable()
export class ClientRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: CreerClientData) {
    const [client] = await this.db.insert(customers).values(data).returning();
    return client;
  }

  async lister(tenantId: string, page: number, limit: number, recherche?: string) {
    const conditions = [eq(customers.tenantId, tenantId), isNull(customers.deletedAt)];

    if (recherche) {
      conditions.push(
        or(
          ilike(customers.firstName, `%${recherche}%`),
          ilike(customers.lastName, `%${recherche}%`),
          ilike(customers.phone, `%${recherche}%`),
          ilike(customers.email, `%${recherche}%`),
        )!,
      );
    }

    const offset = (page - 1) * limit;
    const data = await this.db.query.customers.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: customers.firstName,
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(and(...conditions));

    return { data, total: Number(countResult?.count ?? 0) };
  }

  async trouverParId(tenantId: string, id: string) {
    return this.db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
    });
  }

  async modifier(tenantId: string, id: string, data: Partial<CreerClientData>) {
    const [updated] = await this.db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  }

  /**
   * KPIs cumules sur les tickets COMPLETED d'un client : CA total, nombre
   * de tickets, ticket moyen, date premier et dernier achat.
   */
  async kpisClient(tenantId: string, clientId: string) {
    const [row] = await this.db
      .select({
        caTotal: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nbTickets: sql<number>`COUNT(*)`,
        premierAchat: sql<Date | null>`MIN(${tickets.completedAt})`,
        dernierAchat: sql<Date | null>`MAX(${tickets.completedAt})`,
      })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.customerId, clientId),
        eq(tickets.status, "COMPLETED"),
      ));
    return {
      caTotal: Number(row?.caTotal ?? 0),
      nbTickets: Number(row?.nbTickets ?? 0),
      premierAchat: row?.premierAchat ?? null,
      dernierAchat: row?.dernierAchat ?? null,
    };
  }

  /**
   * Historique paginé des tickets COMPLETED pour un client donné.
   * Tri du plus recent au plus ancien.
   */
  async historiqueTickets(tenantId: string, clientId: string, page: number, pageSize: number) {
    const conditions = and(
      eq(tickets.tenantId, tenantId),
      eq(tickets.customerId, clientId),
      eq(tickets.status, "COMPLETED"),
    );

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(tickets)
      .where(conditions);

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        total: tickets.total,
        completedAt: tickets.completedAt,
        locationId: tickets.locationId,
      })
      .from(tickets)
      .where(conditions)
      .orderBy(desc(tickets.completedAt))
      .limit(pageSize)
      .offset(offset);

    return { rows, total: Number(countRow?.total ?? 0) };
  }
}
