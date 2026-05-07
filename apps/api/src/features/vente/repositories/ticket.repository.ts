import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, tickets, ticketLines, ticketPayments,
  variants, products, serials, batches,
} from "@libitex/db";

@Injectable()
export class TicketRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // --- Ticket CRUD ---

  async compterTicketsDuJour(tenantId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        sql`DATE(${tickets.createdAt}) = CURRENT_DATE`,
      ));
    return Number(result?.count ?? 0);
  }

  async creerTicket(data: {
    tenantId: string; locationId: string; userId: string;
    ticketNumber: string; customerName?: string; customerPhone?: string; note?: string;
  }) {
    const [ticket] = await this.db
      .insert(tickets)
      .values({ ...data, status: "OPEN" })
      .returning();
    return ticket;
  }

  async mettreAJourTotaux(ticketId: string, totaux: {
    subtotal: string; taxAmount: string; total: string;
  }) {
    const [updated] = await this.db
      .update(tickets)
      .set({ ...totaux, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updated;
  }

  async changerStatut(tenantId: string, ticketId: string, statut: string, extra?: Record<string, any>) {
    const [updated] = await this.db
      .update(tickets)
      .set({ status: statut as any, updatedAt: new Date(), ...extra })
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async obtenirParId(tenantId: string, ticketId: string) {
    return this.db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)),
    });
  }

  // --- Lignes ---

  async creerLigne(data: {
    ticketId: string; variantId: string; productName: string; variantName?: string | null;
    sku: string; quantity: number; unitPrice: string; discount: string;
    taxRate: string; taxAmount: string; lineTotal: string;
    serialNumber?: string; serialId?: string; batchId?: string; batchNumber?: string;
  }) {
    const [ligne] = await this.db.insert(ticketLines).values(data).returning();
    return ligne;
  }

  async obtenirLignes(ticketId: string) {
    return this.db.query.ticketLines.findMany({
      where: eq(ticketLines.ticketId, ticketId),
    });
  }

  // --- Paiements ---

  async creerPaiement(data: { ticketId: string; method: string; amount: string; reference?: string }) {
    const [paiement] = await this.db.insert(ticketPayments).values(data as any).returning();
    return paiement;
  }

  async obtenirPaiements(ticketId: string) {
    return this.db.query.ticketPayments.findMany({
      where: eq(ticketPayments.ticketId, ticketId),
    });
  }

  // --- Resolution variante / produit ---

  async obtenirVarianteAvecProduit(variantId: string) {
    const variant = await this.db.query.variants.findFirst({ where: eq(variants.id, variantId) });
    if (!variant) return null;
    const product = await this.db.query.products.findFirst({ where: eq(products.id, variant.productId) });
    return product ? { variant, product } : null;
  }

  // --- Serial & Batch ---

  async trouverSerieDisponible(variantId: string, serialNumber: string) {
    return this.db.query.serials.findFirst({
      where: and(
        eq(serials.variantId, variantId),
        eq(serials.serialNumber, serialNumber),
        eq(serials.status, "IN_STOCK"),
      ),
    });
  }

  async marquerSerieVendue(serialId: string, saleId: string) {
    await this.db
      .update(serials)
      .set({ status: "SOLD", saleId, updatedAt: new Date() })
      .where(eq(serials.id, serialId));
  }

  async trouverLotFefo(variantId: string) {
    return this.db.query.batches.findFirst({
      where: and(
        eq(batches.variantId, variantId),
        sql`${batches.quantityRemaining} > 0`,
      ),
      orderBy: batches.expiryDate, // ASC = FEFO
    });
  }

  async decrementerLot(batchId: string, quantite: number) {
    await this.db
      .update(batches)
      .set({ quantityRemaining: sql`${batches.quantityRemaining} - ${quantite}` })
      .where(eq(batches.id, batchId));
  }

  // --- Lister ---

  async listerTickets(tenantId: string, opts: {
    emplacementId?: string; statut?: string; limit: number; offset: number;
  }) {
    const conditions: any[] = [eq(tickets.tenantId, tenantId)];
    if (opts.emplacementId) conditions.push(eq(tickets.locationId, opts.emplacementId));
    if (opts.statut) conditions.push(eq(tickets.status, opts.statut as any));

    const data = await this.db.query.tickets.findMany({
      where: and(...conditions),
      limit: opts.limit,
      offset: opts.offset,
      orderBy: desc(tickets.createdAt),
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(and(...conditions));

    return { data, total: Number(countResult?.count ?? 0) };
  }

  // --- Rapport Z ---

  async rapportZ(tenantId: string, locationId: string, targetDate: string) {
    const conditions = and(
      eq(tickets.tenantId, tenantId),
      eq(tickets.locationId, locationId),
      eq(tickets.status, "COMPLETED"),
      sql`DATE(${tickets.completedAt}) = ${targetDate}`,
    );

    const [summary] = await this.db
      .select({
        totalTickets: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        totalTax: sql<number>`COALESCE(SUM(CAST(${tickets.taxAmount} AS NUMERIC)), 0)`,
        totalDiscount: sql<number>`COALESCE(SUM(CAST(${tickets.discountAmount} AS NUMERIC)), 0)`,
      })
      .from(tickets)
      .where(conditions);

    const paymentBreakdown = await this.db
      .select({
        method: ticketPayments.method,
        total: sql<number>`COALESCE(SUM(CAST(${ticketPayments.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ticketPayments)
      .innerJoin(tickets, eq(ticketPayments.ticketId, tickets.id))
      .where(conditions)
      .groupBy(ticketPayments.method);

    return { summary, paymentBreakdown };
  }
}
