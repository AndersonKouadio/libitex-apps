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
  whatsappOptIn?: boolean;
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

    const where = and(...conditions);
    const offset = (page - 1) * limit;

    // Liste avec agregats par client (CA cumule, nb tickets, dernier achat,
    // nb tickets sur 30 derniers jours) en un seul aller-retour SQL.
    const data = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
        notes: customers.notes,
        createdAt: customers.createdAt,
        caTotal: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'COMPLETED' THEN CAST(${tickets.total} AS NUMERIC) ELSE 0 END), 0)`,
        nbTickets: sql<number>`COUNT(${tickets.id}) FILTER (WHERE ${tickets.status} = 'COMPLETED')`,
        nbTickets30j: sql<number>`COUNT(${tickets.id}) FILTER (WHERE ${tickets.status} = 'COMPLETED' AND ${tickets.completedAt} >= NOW() - INTERVAL '30 days')`,
        dernierAchat: sql<Date | null>`MAX(${tickets.completedAt}) FILTER (WHERE ${tickets.status} = 'COMPLETED')`,
      })
      .from(customers)
      .leftJoin(tickets, and(
        eq(tickets.customerId, customers.id),
        eq(tickets.tenantId, customers.tenantId),
      ))
      .where(where)
      .groupBy(customers.id)
      .orderBy(customers.firstName)
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(where);

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
        nbTickets30j: sql<number>`COUNT(*) FILTER (WHERE ${tickets.completedAt} >= NOW() - INTERVAL '30 days')`,
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
      nbTickets30j: Number(row?.nbTickets30j ?? 0),
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
