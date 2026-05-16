import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, isNull, desc, gte, lte, ilike, or, SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, quotes, quoteLines, customers, variants, products, users,
} from "@libitex/db";

@Injectable()
export class DevisRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Genere un numero de devis sequentiel par tenant et par jour au format
   * DEV-YYYYMMDD-NNN. Premier devis du jour = NNN=001.
   * On compte les devis du jour pour ce tenant (incl. soft deleted pour
   * preserver la sequence visuelle), puis on increment.
   */
  async genererNumero(tenantId: string): Promise<string> {
    const aujourdhui = new Date();
    const yyyymmdd = aujourdhui.toISOString().slice(0, 10).replace(/-/g, "");
    const debutJour = new Date(aujourdhui);
    debutJour.setUTCHours(0, 0, 0, 0);

    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(quotes)
      .where(and(
        eq(quotes.tenantId, tenantId),
        gte(quotes.createdAt, debutJour),
      ));

    const seq = String((row?.count ?? 0) + 1).padStart(3, "0");
    return `DEV-${yyyymmdd}-${seq}`;
  }

  async creer(data: {
    tenantId: string;
    quoteNumber: string;
    customerId: string;
    validUntil: Date;
    paymentTerms?: string;
    deliveryTerms?: string;
    internalNotes?: string;
    customerNotes?: string;
    createdBy: string;
  }) {
    const [devis] = await this.db.insert(quotes).values({
      tenantId: data.tenantId,
      quoteNumber: data.quoteNumber,
      customerId: data.customerId,
      status: "DRAFT",
      issueDate: new Date(),
      validUntil: data.validUntil,
      paymentTerms: data.paymentTerms,
      deliveryTerms: data.deliveryTerms,
      internalNotes: data.internalNotes,
      customerNotes: data.customerNotes,
      createdBy: data.createdBy,
    }).returning();
    return devis;
  }

  async ajouterLignes(quoteId: string, lignes: Array<{
    variantId: string | null;
    sku: string | null;
    productName: string;
    variantName: string | null;
    description: string | null;
    position: number;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    lineSubtotal: string;
    lineTax: string;
    lineTotal: string;
  }>) {
    if (lignes.length === 0) return [];
    return this.db.insert(quoteLines)
      .values(lignes.map((l) => ({ ...l, quoteId })))
      .returning();
  }

  /**
   * Met a jour les totaux header (subtotal, taxAmount, total) a partir de
   * la somme des lignes. Appele apres tout add/remove/update de lignes.
   */
  async recalculerTotaux(quoteId: string, discountAmount: string = "0") {
    const [agg] = await this.db
      .select({
        subtotal: sql<string>`COALESCE(SUM(CAST(${quoteLines.lineSubtotal} AS NUMERIC)), 0)::text`,
        taxAmount: sql<string>`COALESCE(SUM(CAST(${quoteLines.lineTax} AS NUMERIC)), 0)::text`,
      })
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quoteId));

    const subtotal = Number(agg?.subtotal ?? 0);
    const taxAmount = Number(agg?.taxAmount ?? 0);
    const remise = Number(discountAmount);
    const total = Math.max(0, subtotal + taxAmount - remise);

    await this.db.update(quotes)
      .set({
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        discountAmount: remise.toString(),
        total: total.toString(),
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId));
  }

  async lister(tenantId: string, filtres: {
    page: number;
    limit: number;
    statut?: string;
    clientId?: string;
    dateDebut?: Date;
    dateFin?: Date;
    recherche?: string;
  }) {
    const conditions: SQL[] = [
      eq(quotes.tenantId, tenantId),
      isNull(quotes.deletedAt),
    ];
    if (filtres.statut) conditions.push(eq(quotes.status, filtres.statut as any));
    if (filtres.clientId) conditions.push(eq(quotes.customerId, filtres.clientId));
    if (filtres.dateDebut) conditions.push(gte(quotes.issueDate, filtres.dateDebut));
    if (filtres.dateFin) conditions.push(lte(quotes.issueDate, filtres.dateFin));
    if (filtres.recherche) {
      const motif = `%${filtres.recherche}%`;
      conditions.push(or(
        ilike(quotes.quoteNumber, motif),
        ilike(customers.firstName, motif),
        ilike(customers.lastName, motif),
      )!);
    }
    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(where);

    const offset = (filtres.page - 1) * filtres.limit;
    const rows = await this.db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        issueDate: quotes.issueDate,
        validUntil: quotes.validUntil,
        subtotal: quotes.subtotal,
        taxAmount: quotes.taxAmount,
        discountAmount: quotes.discountAmount,
        total: quotes.total,
        sentAt: quotes.sentAt,
        respondedAt: quotes.respondedAt,
        convertedAt: quotes.convertedAt,
        customerId: quotes.customerId,
        prenomClient: customers.firstName,
        nomClient: customers.lastName,
        telephoneClient: customers.phone,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(where)
      .orderBy(desc(quotes.createdAt))
      .limit(filtres.limit)
      .offset(offset);

    return { rows, total: Number(countRow?.total ?? 0) };
  }

  async trouverParId(tenantId: string, id: string) {
    return this.db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        issueDate: quotes.issueDate,
        validUntil: quotes.validUntil,
        subtotal: quotes.subtotal,
        taxAmount: quotes.taxAmount,
        discountAmount: quotes.discountAmount,
        total: quotes.total,
        paymentTerms: quotes.paymentTerms,
        deliveryTerms: quotes.deliveryTerms,
        internalNotes: quotes.internalNotes,
        customerNotes: quotes.customerNotes,
        sentAt: quotes.sentAt,
        respondedAt: quotes.respondedAt,
        convertedAt: quotes.convertedAt,
        convertedToInvoiceId: quotes.convertedToInvoiceId,
        customerId: quotes.customerId,
        prenomClient: customers.firstName,
        nomClient: customers.lastName,
        telephoneClient: customers.phone,
        emailClient: customers.email,
        adresseClient: customers.address,
        createdBy: quotes.createdBy,
        prenomAuteur: users.firstName,
        nomAuteur: users.lastName,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .leftJoin(users, eq(quotes.createdBy, users.id))
      .where(and(
        eq(quotes.id, id),
        eq(quotes.tenantId, tenantId),
        isNull(quotes.deletedAt),
      ))
      .limit(1)
      .then((rows) => rows[0]);
  }

  async obtenirLignes(quoteId: string) {
    return this.db
      .select()
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quoteId))
      .orderBy(quoteLines.position);
  }

  async supprimerLignes(quoteId: string) {
    await this.db.delete(quoteLines).where(eq(quoteLines.quoteId, quoteId));
  }

  async modifierHeader(tenantId: string, id: string, data: Partial<{
    customerId: string;
    validUntil: Date;
    paymentTerms: string;
    deliveryTerms: string;
    internalNotes: string;
    customerNotes: string;
    discountAmount: string;
  }>) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(cleaned).length === 0) return;
    await this.db.update(quotes)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)));
  }

  async changerStatut(
    tenantId: string,
    id: string,
    nouveauStatut: "DRAFT" | "SENT" | "ACCEPTED" | "REFUSED" | "EXPIRED" | "CONVERTED" | "CANCELLED",
    horodatages: Partial<{ sentAt: Date; respondedAt: Date; convertedAt: Date; convertedToInvoiceId: string }> = {},
  ) {
    await this.db.update(quotes)
      .set({ status: nouveauStatut, ...horodatages, updatedAt: new Date() })
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)));
  }

  async supprimer(tenantId: string, id: string) {
    await this.db.update(quotes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)));
  }

  /**
   * Resout une variante avec son produit pour snapshot lors de l'ajout
   * d'une ligne devis (sku, productName, variantName, taxRate).
   */
  async obtenirVarianteAvecProduit(tenantId: string, variantId: string) {
    return this.db
      .select({
        variantId: variants.id,
        sku: variants.sku,
        variantName: variants.name,
        unitPrice: variants.priceRetail,
        productId: products.id,
        productName: products.name,
        taxRate: products.taxRate,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(eq(variants.id, variantId), eq(products.tenantId, tenantId)))
      .limit(1)
      .then((rows) => rows[0]);
  }
}
