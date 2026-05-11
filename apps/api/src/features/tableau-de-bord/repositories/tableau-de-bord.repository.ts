import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, tickets, ticketLines, ticketPayments, variants, products, locations,
} from "@libitex/db";

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

  /**
   * Top N produits (par CA) sur la fenetre glissante. Joint sur products
   * via variants pour avoir le nom canonique (au cas ou le produit aurait
   * ete renomme apres la vente — ticket_lines a un snapshot du nom).
   */
  async topProduits(tenantId: string, jours: number, limit: number) {
    return this.db
      .select({
        variantId: ticketLines.variantId,
        nomProduit: products.name,
        nomVariante: variants.name,
        sku: ticketLines.sku,
        quantiteTotale: sql<number>`SUM(CAST(${ticketLines.quantity} AS NUMERIC))`,
        chiffreAffaires: sql<number>`SUM(CAST(${ticketLines.lineTotal} AS NUMERIC))`,
        nombreVentes: sql<number>`COUNT(*)`,
      })
      .from(ticketLines)
      .innerJoin(tickets, eq(ticketLines.ticketId, tickets.id))
      .innerJoin(variants, eq(ticketLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "COMPLETED"),
        sql`${tickets.completedAt} >= NOW() - (${jours} || ' days')::interval`,
      ))
      .groupBy(ticketLines.variantId, products.name, variants.name, ticketLines.sku)
      .orderBy(desc(sql`SUM(CAST(${ticketLines.lineTotal} AS NUMERIC))`))
      .limit(limit);
  }

  /**
   * Repartition CA par methode de paiement sur la periode. Utilise
   * ticket_payments qui supporte les paiements multi-modes par ticket.
   */
  async repartitionPaiements(tenantId: string, jours: number) {
    return this.db
      .select({
        methode: ticketPayments.method,
        total: sql<number>`SUM(CAST(${ticketPayments.amount} AS NUMERIC))`,
        nombre: sql<number>`COUNT(*)`,
      })
      .from(ticketPayments)
      .innerJoin(tickets, eq(ticketPayments.ticketId, tickets.id))
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "COMPLETED"),
        sql`${tickets.completedAt} >= NOW() - (${jours} || ' days')::interval`,
      ))
      .groupBy(ticketPayments.method);
  }

  /**
   * Resume CA + tickets sur les N derniers jours (utilise pour la
   * tendance vs periode precedente). Retourne 0 si aucune vente.
   */
  async resumePeriode(tenantId: string, jours: number, offsetJours = 0) {
    const [row] = await this.db
      .select({
        recettes: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nombre: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "COMPLETED"),
        sql`${tickets.completedAt} >= NOW() - ((${jours + offsetJours}) || ' days')::interval`,
        sql`${tickets.completedAt} < NOW() - (${offsetJours} || ' days')::interval`,
      ));
    return { recettes: Number(row?.recettes ?? 0), nombre: Number(row?.nombre ?? 0) };
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
