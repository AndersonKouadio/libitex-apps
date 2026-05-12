import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql, desc, ilike, or, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, suppliers, purchaseOrders, purchaseOrderLines,
  stockMovements, variants, products,
} from "@libitex/db";

@Injectable()
export class AchatRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // ─── Suppliers ────────────────────────────────────────────────────────

  async creerFournisseur(data: {
    tenantId: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
    notes?: string;
  }) {
    const [row] = await this.db.insert(suppliers).values(data).returning();
    return row;
  }

  async listerFournisseurs(tenantId: string, recherche?: string) {
    const conditions: SQL[] = [
      eq(suppliers.tenantId, tenantId),
      isNull(suppliers.deletedAt),
    ];
    if (recherche) {
      conditions.push(or(
        ilike(suppliers.name, `%${recherche}%`),
        ilike(suppliers.contactName, `%${recherche}%`),
        ilike(suppliers.phone, `%${recherche}%`),
        ilike(suppliers.email, `%${recherche}%`),
      )!);
    }
    return this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(suppliers.name);
  }

  async trouverFournisseur(tenantId: string, id: string) {
    return this.db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.id, id),
        eq(suppliers.tenantId, tenantId),
        isNull(suppliers.deletedAt),
      ),
    });
  }

  async modifierFournisseur(tenantId: string, id: string, data: Partial<{
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    paymentTerms: string | null;
    notes: string | null;
    isActive: boolean;
  }>) {
    const [row] = await this.db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();
    return row;
  }

  async supprimerFournisseur(tenantId: string, id: string) {
    await this.db
      .update(suppliers)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)));
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────

  /**
   * Numerotation sequentielle par jour : BC-YYYYMMDD-NNN. NNN compte les
   * commandes deja creees ce jour-la pour ce tenant.
   */
  async genererNumeroCommande(tenantId: string): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `BC-${y}${m}${d}`;
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.tenantId, tenantId),
        sql`${purchaseOrders.orderNumber} LIKE ${prefix + "-%"}`,
      ));
    const next = Number(row?.count ?? 0) + 1;
    return `${prefix}-${String(next).padStart(3, "0")}`;
  }

  async creerCommande(data: {
    tenantId: string;
    orderNumber: string;
    supplierId: string;
    locationId: string;
    expectedDate?: Date;
    notes?: string;
    createdBy?: string;
    totalAmount: string;
  }) {
    const [row] = await this.db.insert(purchaseOrders).values(data).returning();
    return row;
  }

  async ajouterLignes(lignes: {
    purchaseOrderId: string;
    variantId: string;
    quantityOrdered: string;
    unitPrice: string;
    lineTotal: string;
  }[]) {
    if (lignes.length === 0) return;
    await this.db.insert(purchaseOrderLines).values(lignes);
  }

  async listerCommandes(tenantId: string, filtres: {
    statut?: string;
    supplierId?: string;
    locationId?: string;
  } = {}) {
    const conditions: SQL[] = [eq(purchaseOrders.tenantId, tenantId)];
    if (filtres.statut) conditions.push(eq(purchaseOrders.status, filtres.statut as any));
    if (filtres.supplierId) conditions.push(eq(purchaseOrders.supplierId, filtres.supplierId));
    if (filtres.locationId) conditions.push(eq(purchaseOrders.locationId, filtres.locationId));

    return this.db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        locationId: purchaseOrders.locationId,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        expectedDate: purchaseOrders.expectedDate,
        receivedAt: purchaseOrders.receivedAt,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        nombreLignes: sql<number>`(SELECT COUNT(*) FROM ${purchaseOrderLines} WHERE ${purchaseOrderLines.purchaseOrderId} = ${purchaseOrders.id})::int`,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async trouverCommande(tenantId: string, id: string) {
    return this.db.query.purchaseOrders.findFirst({
      where: and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId),
      ),
    });
  }

  /** Lignes + variante + produit (pour le rendu). */
  async listerLignesCommande(purchaseOrderId: string) {
    return this.db
      .select({
        id: purchaseOrderLines.id,
        variantId: purchaseOrderLines.variantId,
        productId: variants.productId,
        productName: products.name,
        variantName: variants.name,
        sku: variants.sku,
        quantityOrdered: purchaseOrderLines.quantityOrdered,
        quantityReceived: purchaseOrderLines.quantityReceived,
        unitPrice: purchaseOrderLines.unitPrice,
        lineTotal: purchaseOrderLines.lineTotal,
      })
      .from(purchaseOrderLines)
      .innerJoin(variants, eq(purchaseOrderLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId));
  }

  async modifierStatutCommande(
    tenantId: string,
    id: string,
    status: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED",
    receivedAt?: Date,
  ) {
    const [row] = await this.db
      .update(purchaseOrders)
      .set({ status, receivedAt, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();
    return row;
  }

  async modifierLigneRecue(lineId: string, nouveauRecu: string) {
    await this.db
      .update(purchaseOrderLines)
      .set({ quantityReceived: nouveauRecu })
      .where(eq(purchaseOrderLines.id, lineId));
  }

  /**
   * Mouvement STOCK_IN cree au moment d'une reception. Pas de gestion lot
   * (PERISHABLE) ici : pour les produits perissables, il faut passer par
   * /stock/entree qui force le numero de lot et la date d'expiration.
   */
  async enregistrerEntreeReception(data: {
    tenantId: string;
    variantId: string;
    locationId: string;
    quantity: string;
    userId: string;
    purchaseOrderId: string;
    orderNumber: string;
  }) {
    const [row] = await this.db.insert(stockMovements).values({
      tenantId: data.tenantId,
      variantId: data.variantId,
      locationId: data.locationId,
      movementType: "STOCK_IN",
      quantity: data.quantity,
      userId: data.userId,
      referenceType: "PURCHASE_ORDER",
      referenceId: data.purchaseOrderId,
      note: `Reception ${data.orderNumber}`,
    }).returning();
    return row;
  }

  /**
   * Met a jour le prix d'achat de la variante. Strategie simple : on
   * remplace par le dernier prix paye. (Une vraie moyenne ponderee serait
   * preferable a terme.)
   */
  async majPrixAchatVariante(variantId: string, prixAchat: string) {
    await this.db
      .update(variants)
      .set({ pricePurchase: prixAchat, updatedAt: new Date() })
      .where(eq(variants.id, variantId));
  }
}
