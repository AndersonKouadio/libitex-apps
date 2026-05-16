import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, tickets, ticketLines, ticketPayments,
  variants, products, serials, batches, customers, tenants,
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
    tenantId: string; locationId: string; userId: string; sessionId: string;
    ticketNumber: string; customerId?: string;
    customerName?: string; customerPhone?: string; note?: string;
    /** Cle d'idempotence pour les ventes offline resyncees (fix C4). */
    idempotencyKey?: string;
  }) {
    const [ticket] = await this.db
      .insert(tickets)
      .values({ ...data, status: "OPEN" })
      .returning();
    return ticket;
  }

  /**
   * Lookup par cle d'idempotence (UUID v4 envoye par le frontend offline).
   * Si trouve, on retourne ce ticket pour eviter un doublon. Fix C4.
   */
  async trouverParIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return this.db.query.tickets.findFirst({
      where: and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.idempotencyKey, idempotencyKey),
      ),
    });
  }

  async rattacherSession(ticketId: string, sessionId: string) {
    const [updated] = await this.db
      .update(tickets)
      .set({ sessionId, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updated;
  }

  async detacherSession(ticketId: string) {
    const [updated] = await this.db
      .update(tickets)
      .set({ sessionId: null, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updated;
  }

  async listerParkesSansSession(tenantId: string, locationId: string) {
    return this.db.query.tickets.findMany({
      where: and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.locationId, locationId),
        eq(tickets.status, "PARKED"),
        sql`${tickets.sessionId} IS NULL`,
      ),
      orderBy: desc(tickets.createdAt),
    });
  }

  async mettreAJourTotaux(ticketId: string, totaux: {
    subtotal: string; taxAmount: string; total: string;
    discountAmount?: string; note?: string;
    /** Module 11 D1 : raison de la remise (ex "PROMO:RENTREE10"). */
    discountReason?: string | null;
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

  /**
   * Module 10 D2 : recupere en une seule query les infos necessaires pour
   * envoyer une notification ticket : nom boutique + nom/tel/opt-in client.
   * Le client est null si le ticket n'est pas rattache (customerId null).
   */
  async obtenirContexteNotification(tenantId: string, ticketId: string) {
    const [row] = await this.db
      .select({
        nomBoutique: tenants.name,
        clientPrenom: customers.firstName,
        clientNom: customers.lastName,
        clientTelephone: customers.phone,
        clientOptIn: customers.whatsappOptIn,
      })
      .from(tickets)
      .innerJoin(tenants, eq(tickets.tenantId, tenants.id))
      .leftJoin(customers, eq(tickets.customerId, customers.id))
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));
    return row;
  }

  // --- Lignes ---

  async creerLigne(data: {
    ticketId: string; variantId: string; productName: string; variantName?: string | null;
    // numeric(15, 3) cote DB : drizzle attend une string pour preserver la precision
    sku: string; quantity: string; unitPrice: string; discount: string;
    taxRate: string; taxAmount: string; lineTotal: string;
    serialNumber?: string; serialId?: string; batchId?: string; batchNumber?: string;
    supplements?: Array<{ supplementId: string; name: string; unitPrice: number; quantity: number }>;
  }) {
    const [ligne] = await this.db.insert(ticketLines).values({
      ...data,
      supplements: data.supplements ?? [],
    }).returning();
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
    // batches.quantityRemaining reste integer (peremption au lot, pas au gramme).
    // On arrondit la quantite vendue pour rester compatible avec le typage entier.
    const entier = Math.round(quantite);
    await this.db
      .update(batches)
      .set({ quantityRemaining: sql`${batches.quantityRemaining} - ${entier}` })
      .where(eq(batches.id, batchId));
  }

  // --- Retours POS (A3) ---

  /**
   * Crée un ticket de retour (type='RETURN') directement en statut COMPLETED.
   * Le ticket est rattaché au ticket d'origine via refTicketId.
   */
  async creerTicketRetour(data: {
    tenantId: string; locationId: string; userId: string;
    ticketNumber: string; refTicketId: string;
    customerId?: string; customerName?: string; customerPhone?: string;
    subtotal: string; total: string;
    motif?: string;
  }) {
    const [ticket] = await this.db
      .insert(tickets)
      .values({
        tenantId: data.tenantId,
        locationId: data.locationId,
        userId: data.userId,
        ticketNumber: data.ticketNumber,
        ticketType: "RETURN",
        refTicketId: data.refTicketId,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        subtotal: data.subtotal,
        taxAmount: "0",
        discountAmount: "0",
        total: data.total,
        note: data.motif ?? null,
        status: "COMPLETED",
        completedAt: new Date(),
      } as any)
      .returning();
    return ticket;
  }

  /**
   * Lignes d'un ticket enrichies du nom produit, nom variante et SKU.
   * Utilisé pour construire le ticket de retour (copier unitPrice, variantId, etc.)
   */
  async obtenirLignesAvecDetails(ticketId: string) {
    return this.db
      .select({
        id: ticketLines.id,
        variantId: ticketLines.variantId,
        nomProduit: products.name,
        nomVariante: variants.name,
        sku: variants.sku,
        quantity: ticketLines.quantity,
        unitPrice: ticketLines.unitPrice,
        lineTotal: ticketLines.lineTotal,
        taxRate: ticketLines.taxRate,
      })
      .from(ticketLines)
      .innerJoin(variants, eq(ticketLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(ticketLines.ticketId, ticketId));
  }

  /**
   * Pour chaque ligneId du ticket original, calcule la quantité déjà retournée
   * (somme des quantités dans les tickets RETURN qui référencent le même ticket).
   * Retourne une Map<ligneOrigId, quantiteDejaRetournee>.
   *
   * Stratégie : les lignes de retour contiennent la même variantId que les
   * lignes originales. On les regroupe par variantId pour retrouver les totaux.
   * Un champ refTicketId sur le ticket de retour permet de filtrer précisément.
   */
  async quantitesDejaRetournees(
    tenantId: string, refTicketId: string,
  ): Promise<Map<string, number>> {
    // Trouver tous les tickets RETURN qui référencent ce ticket
    const ticketsRetour = await this.db
      .select({ id: tickets.id })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.refTicketId as any, refTicketId),
        eq(tickets.status, "COMPLETED"),
      ));
    if (ticketsRetour.length === 0) return new Map();

    const retourIds = ticketsRetour.map((t) => t.id);

    // Sommer les quantités retournées par (ticketId_orig_ligne, variantId)
    // On relie via variantId car les lignes de retour n'ont pas de ref vers
    // la ligne originale (on évite la sur-ingénierie du schéma).
    const lignesRetour = await this.db
      .select({
        variantId: ticketLines.variantId,
        totalRetourne: sql<number>`COALESCE(SUM(CAST(${ticketLines.quantity} AS NUMERIC)), 0)`,
      })
      .from(ticketLines)
      .where(inArray(ticketLines.ticketId, retourIds))
      .groupBy(ticketLines.variantId);

    // Map variantId → quantité retournée (pour comparer ligne par ligne)
    return new Map(lignesRetour.map((r) => [r.variantId, Number(r.totalRetourne)]));
  }

  /**
   * Compte les tickets de retour existants pour un ticket original.
   * Utilisé pour générer un suffixe unique au numéro RET- (ex: RET-T001-01).
   */
  async compterRetoursDuTicket(tenantId: string, refTicketId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.refTicketId as any, refTicketId),
      ));
    return Number(row?.n ?? 0);
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

  /**
   * Rapport Z par emplacement + date (independant des sessions caisse).
   * Plus pratique sur le terrain : un Z = un jour, peu importe combien
   * de sessions ont ete ouvertes/fermees ce jour-la pour cet emplacement.
   *
   * Inclut : resume (CA, tickets, TVA, remise), ventilation paiements,
   * top 5 produits du jour, ventes par tranche horaire (24 buckets).
   */
  async rapportZParDate(tenantId: string, locationId: string, date: string) {
    const filtreDate = sql`DATE(${tickets.completedAt}) = ${date}`;
    const conditions = and(
      eq(tickets.tenantId, tenantId),
      eq(tickets.locationId, locationId),
      eq(tickets.status, "COMPLETED"),
      filtreDate,
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

    const topProduits = await this.db
      .select({
        variantId: ticketLines.variantId,
        nomProduit: products.name,
        nomVariante: variants.name,
        sku: ticketLines.sku,
        quantite: sql<number>`SUM(CAST(${ticketLines.quantity} AS NUMERIC))`,
        chiffreAffaires: sql<number>`SUM(CAST(${ticketLines.lineTotal} AS NUMERIC))`,
      })
      .from(ticketLines)
      .innerJoin(tickets, eq(ticketLines.ticketId, tickets.id))
      .innerJoin(variants, eq(ticketLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(conditions)
      .groupBy(ticketLines.variantId, products.name, variants.name, ticketLines.sku)
      .orderBy(desc(sql`SUM(CAST(${ticketLines.lineTotal} AS NUMERIC))`))
      .limit(5);

    const ventesParHeure = await this.db
      .select({
        heure: sql<number>`EXTRACT(HOUR FROM ${tickets.completedAt})::int`,
        recettes: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nombre: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(conditions)
      .groupBy(sql`EXTRACT(HOUR FROM ${tickets.completedAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${tickets.completedAt})`);

    return { summary, paymentBreakdown, topProduits, ventesParHeure };
  }

  /**
   * Ventes agregees par jour sur une periode (date debut/fin incluses).
   * Filtrable par emplacement. Inclut CA, nombre tickets, TVA, remise.
   */
  async ventesParPeriode(
    tenantId: string,
    debut: string,
    fin: string,
    locationId?: string,
  ) {
    const conditions = [
      eq(tickets.tenantId, tenantId),
      eq(tickets.status, "COMPLETED"),
      sql`DATE(${tickets.completedAt}) >= ${debut}`,
      sql`DATE(${tickets.completedAt}) <= ${fin}`,
    ];
    if (locationId) conditions.push(eq(tickets.locationId, locationId));

    return this.db
      .select({
        date: sql<string>`TO_CHAR(DATE(${tickets.completedAt}), 'YYYY-MM-DD')`,
        recettes: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nombre: sql<number>`COUNT(*)`,
        tva: sql<number>`COALESCE(SUM(CAST(${tickets.taxAmount} AS NUMERIC)), 0)`,
        remises: sql<number>`COALESCE(SUM(CAST(${tickets.discountAmount} AS NUMERIC)), 0)`,
      })
      .from(tickets)
      .where(and(...conditions))
      .groupBy(sql`DATE(${tickets.completedAt})`)
      .orderBy(sql`DATE(${tickets.completedAt})`);
  }

  /**
   * Repartition TVA par taux sur une periode. Une ligne par taux distinct
   * trouve dans ticket_lines (incluant 0% pour les exoneres). Calculs :
   *   Base HT = SUM(lineTotal - taxAmount)
   *   TVA collectee = SUM(taxAmount)
   *   Total TTC = SUM(lineTotal)
   */
  async tvaParTaux(
    tenantId: string,
    debut: string,
    fin: string,
    locationId?: string,
  ) {
    const conditions = [
      eq(tickets.tenantId, tenantId),
      eq(tickets.status, "COMPLETED"),
      sql`DATE(${tickets.completedAt}) >= ${debut}`,
      sql`DATE(${tickets.completedAt}) <= ${fin}`,
    ];
    if (locationId) conditions.push(eq(tickets.locationId, locationId));

    return this.db
      .select({
        taux: sql<string>`COALESCE(${ticketLines.taxRate}, '0')`,
        baseHt: sql<number>`COALESCE(SUM(CAST(${ticketLines.lineTotal} AS NUMERIC) - COALESCE(CAST(${ticketLines.taxAmount} AS NUMERIC), 0)), 0)`,
        tva: sql<number>`COALESCE(SUM(COALESCE(CAST(${ticketLines.taxAmount} AS NUMERIC), 0)), 0)`,
        totalTtc: sql<number>`COALESCE(SUM(CAST(${ticketLines.lineTotal} AS NUMERIC)), 0)`,
        nombreLignes: sql<number>`COUNT(*)`,
      })
      .from(ticketLines)
      .innerJoin(tickets, eq(ticketLines.ticketId, tickets.id))
      .where(and(...conditions))
      .groupBy(ticketLines.taxRate)
      .orderBy(sql`COALESCE(${ticketLines.taxRate}, '0') DESC`);
  }

  /**
   * Marges par produit sur une periode. CA = SUM(lineTotal),
   * Cout = SUM(quantity * variants.pricePurchase), Marge brute = CA - Cout.
   * Les variantes sans prix d'achat (=0) sortent avec marge = CA et un
   * marqueur prixAchatManquant=true pour signaler.
   */
  async margesParProduit(
    tenantId: string,
    debut: string,
    fin: string,
    locationId?: string,
  ) {
    const conditions = [
      eq(tickets.tenantId, tenantId),
      eq(tickets.status, "COMPLETED"),
      sql`DATE(${tickets.completedAt}) >= ${debut}`,
      sql`DATE(${tickets.completedAt}) <= ${fin}`,
    ];
    if (locationId) conditions.push(eq(tickets.locationId, locationId));

    return this.db
      .select({
        variantId: ticketLines.variantId,
        nomProduit: products.name,
        nomVariante: variants.name,
        sku: ticketLines.sku,
        prixAchat: variants.pricePurchase,
        quantiteTotale: sql<number>`SUM(CAST(${ticketLines.quantity} AS NUMERIC))`,
        chiffreAffaires: sql<number>`SUM(CAST(${ticketLines.lineTotal} AS NUMERIC))`,
      })
      .from(ticketLines)
      .innerJoin(tickets, eq(ticketLines.ticketId, tickets.id))
      .innerJoin(variants, eq(ticketLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(...conditions))
      .groupBy(ticketLines.variantId, products.name, variants.name, ticketLines.sku, variants.pricePurchase)
      .orderBy(desc(sql`SUM(CAST(${ticketLines.lineTotal} AS NUMERIC))`));
  }

  // --- Rapport Z par session ---

  async rapportZParSession(tenantId: string, sessionId: string) {
    const conditions = and(
      eq(tickets.tenantId, tenantId),
      eq(tickets.sessionId, sessionId),
      eq(tickets.status, "COMPLETED"),
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
