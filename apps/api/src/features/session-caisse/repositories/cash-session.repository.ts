import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc, inArray, gte, lte } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, cashSessions, tickets, ticketPayments,
  locations, users,
} from "@libitex/db";

@Injectable()
export class CashSessionRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async compterSessionsDuJour(tenantId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cashSessions)
      .where(and(
        eq(cashSessions.tenantId, tenantId),
        sql`DATE(${cashSessions.openedAt}) = CURRENT_DATE`,
      ));
    return Number(result?.count ?? 0);
  }

  async creer(data: {
    tenantId: string; locationId: string; cashierId: string;
    sessionNumber: string; openingFloat: Record<string, number>;
    openingNote?: string;
  }) {
    const [created] = await this.db
      .insert(cashSessions)
      .values({
        tenantId: data.tenantId,
        locationId: data.locationId,
        cashierId: data.cashierId,
        sessionNumber: data.sessionNumber,
        openingFloat: data.openingFloat,
        openingNote: data.openingNote,
        status: "OPEN",
      })
      .returning();
    return created;
  }

  async obtenirParId(tenantId: string, id: string) {
    return this.db.query.cashSessions.findFirst({
      where: and(eq(cashSessions.id, id), eq(cashSessions.tenantId, tenantId)),
    });
  }

  async trouverActive(tenantId: string, cashierId: string, locationId: string) {
    return this.db.query.cashSessions.findFirst({
      where: and(
        eq(cashSessions.tenantId, tenantId),
        eq(cashSessions.cashierId, cashierId),
        eq(cashSessions.locationId, locationId),
        eq(cashSessions.status, "OPEN"),
      ),
    });
  }

  async fermer(id: string, data: {
    closingDeclared: Record<string, number>;
    closingTheoretical: Record<string, number>;
    variance: Record<string, number>;
    closingNote?: string;
  }) {
    const [updated] = await this.db
      .update(cashSessions)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        closingDeclared: data.closingDeclared,
        closingTheoretical: data.closingTheoretical,
        variance: data.variance,
        closingNote: data.closingNote,
      })
      .where(eq(cashSessions.id, id))
      .returning();
    return updated;
  }

  async lister(tenantId: string, opts: {
    emplacementId?: string; caissierId?: string; statut?: "OPEN" | "CLOSED";
    dateDebut?: string; dateFin?: string;
    limit: number; offset: number;
  }) {
    const conditions: any[] = [eq(cashSessions.tenantId, tenantId)];
    if (opts.emplacementId) conditions.push(eq(cashSessions.locationId, opts.emplacementId));
    if (opts.caissierId) conditions.push(eq(cashSessions.cashierId, opts.caissierId));
    if (opts.statut) conditions.push(eq(cashSessions.status, opts.statut));
    if (opts.dateDebut) conditions.push(gte(cashSessions.openedAt, new Date(opts.dateDebut)));
    if (opts.dateFin) {
      const fin = new Date(opts.dateFin);
      fin.setHours(23, 59, 59, 999);
      conditions.push(lte(cashSessions.openedAt, fin));
    }

    const data = await this.db.query.cashSessions.findMany({
      where: and(...conditions),
      limit: opts.limit,
      offset: opts.offset,
      orderBy: desc(cashSessions.openedAt),
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cashSessions)
      .where(and(...conditions));

    return { data, total: Number(countResult?.count ?? 0) };
  }

  // Recupere les noms emplacement/caissier en bulk pour la liste
  async hydraterNoms(sessions: { locationId: string; cashierId: string }[]) {
    if (sessions.length === 0) return { locations: new Map(), cashiers: new Map() };

    const locationIds = [...new Set(sessions.map((s) => s.locationId))];
    const cashierIds = [...new Set(sessions.map((s) => s.cashierId))];

    const [locs, usrs] = await Promise.all([
      this.db.query.locations.findMany({ where: inArray(locations.id, locationIds) }),
      this.db.query.users.findMany({ where: inArray(users.id, cashierIds) }),
    ]);

    const locationsMap = new Map(locs.map((l) => [l.id, l.name]));
    const cashiersMap = new Map(usrs.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    return { locations: locationsMap, cashiers: cashiersMap };
  }

  // --- Stats / agregation pour cloture et historique ---

  /**
   * Theorique = openingFloat + somme des paiements rattaches a la session,
   * par methode. Calcule via JOIN sur tickets COMPLETED uniquement.
   */
  async calculerVentilationPaiements(sessionId: string): Promise<{
    method: string; total: number; count: number;
  }[]> {
    const result = await this.db
      .select({
        method: ticketPayments.method,
        total: sql<number>`COALESCE(SUM(CAST(${ticketPayments.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ticketPayments)
      .innerJoin(tickets, eq(ticketPayments.ticketId, tickets.id))
      .where(and(
        eq(tickets.sessionId, sessionId),
        eq(tickets.status, "COMPLETED"),
      ))
      .groupBy(ticketPayments.method);

    return result.map((r) => ({
      method: r.method,
      total: Number(r.total),
      count: Number(r.count),
    }));
  }

  async obtenirStatsSession(sessionId: string): Promise<{
    nombreTickets: number; totalEncaisse: number;
  }> {
    const [stats] = await this.db
      .select({
        nombreTickets: sql<number>`COUNT(*)`,
        totalEncaisse: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
      })
      .from(tickets)
      .where(and(
        eq(tickets.sessionId, sessionId),
        eq(tickets.status, "COMPLETED"),
      ));

    return {
      nombreTickets: Number(stats?.nombreTickets ?? 0),
      totalEncaisse: Number(stats?.totalEncaisse ?? 0),
    };
  }

  async listerTicketsEnCours(sessionId: string) {
    return this.db.query.tickets.findMany({
      where: and(
        eq(tickets.sessionId, sessionId),
        inArray(tickets.status, ["OPEN", "PARKED"]),
      ),
      orderBy: desc(tickets.createdAt),
    });
  }

  async hydraterEmplacementEtCaissier(
    locationId: string, cashierId: string,
  ): Promise<{ locationName: string; cashierName: string }> {
    const [loc, user] = await Promise.all([
      this.db.query.locations.findFirst({ where: eq(locations.id, locationId) }),
      this.db.query.users.findFirst({ where: eq(users.id, cashierId) }),
    ]);
    return {
      locationName: loc?.name ?? "—",
      cashierName: user ? `${user.firstName} ${user.lastName}` : "—",
    };
  }
}
