import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, tickets, products, locations } from "@libitex/db";

@Injectable()
export class TableauDeBordRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async resumeJour(tenantId: string, dateIso: string) {
    const [row] = await this.db
      .select({
        recettes: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nombre: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "COMPLETED"),
        sql`DATE(${tickets.completedAt}) = ${dateIso}`,
      ));

    return {
      recettes: Number(row?.recettes ?? 0),
      nombre: Number(row?.nombre ?? 0),
    };
  }

  async compterProduitsActifs(tenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), isNull(products.deletedAt)));
    return Number(row?.count ?? 0);
  }

  async compterEmplacements(tenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(locations)
      .where(eq(locations.tenantId, tenantId));
    return Number(row?.count ?? 0);
  }

  async ventesParJour(tenantId: string, joursEnArriere: number) {
    const rows = await this.db
      .select({
        date: sql<string>`TO_CHAR(DATE(${tickets.completedAt}), 'YYYY-MM-DD')`,
        recettes: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nombre: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "COMPLETED"),
        sql`${tickets.completedAt} >= NOW() - (${joursEnArriere} || ' days')::interval`,
      ))
      .groupBy(sql`DATE(${tickets.completedAt})`)
      .orderBy(sql`DATE(${tickets.completedAt})`);

    return rows.map((r) => ({
      date: r.date,
      recettes: Number(r.recettes),
      nombre: Number(r.nombre),
    }));
  }
}
