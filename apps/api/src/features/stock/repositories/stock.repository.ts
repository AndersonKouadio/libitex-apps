import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, locations, stockMovements, variants, products, batches } from "@libitex/db";

@Injectable()
export class StockRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creerEmplacement(tenantId: string, data: {
    name: string; type?: string; address?: string; parentId?: string;
  }) {
    const [emplacement] = await this.db
      .insert(locations)
      .values({ tenantId, ...data, type: data.type || "STORE" })
      .returning();
    return emplacement;
  }

  async listerEmplacements(tenantId: string) {
    return this.db.query.locations.findMany({
      where: and(eq(locations.tenantId, tenantId), isNull(locations.deletedAt)),
    });
  }

  async trouverEmplacement(tenantId: string, id: string) {
    return this.db.query.locations.findFirst({
      where: and(
        eq(locations.id, id),
        eq(locations.tenantId, tenantId),
        isNull(locations.deletedAt),
      ),
    });
  }

  async modifierEmplacement(
    tenantId: string,
    id: string,
    data: Partial<{ name: string; type: string; address: string }>,
  ) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const [updated] = await this.db
      .update(locations)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async supprimerEmplacement(tenantId: string, id: string) {
    await this.db
      .update(locations)
      .set({ deletedAt: new Date() })
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)));
  }

  async sommeStockEmplacement(tenantId: string, locationId: string): Promise<number> {
    const [r] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)` })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.locationId, locationId),
      ));
    return Number(r?.total ?? 0);
  }

  async enregistrerMouvement(data: {
    tenantId: string; variantId: string; locationId: string;
    movementType: string;
    // numeric(15, 3) cote DB : drizzle attend une string pour preserver la precision.
    quantity: string;
    userId: string;
    note?: string; referenceType?: string; referenceId?: string;
    batchId?: string; serialId?: string;
  }) {
    const [mouvement] = await this.db
      .insert(stockMovements)
      .values(data as any)
      .returning();
    return mouvement;
  }

  async obtenirStockActuel(tenantId: string, variantId: string, locationId: string): Promise<number> {
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)` })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.variantId, variantId),
        eq(stockMovements.locationId, locationId),
      ));
    return Number(result[0]?.total ?? 0);
  }

  async obtenirStockParEmplacement(tenantId: string, locationId: string) {
    return this.db
      .select({
        variantId: stockMovements.variantId,
        quantite: sql<number>`SUM(${stockMovements.quantity})`,
        sku: variants.sku,
        nomVariante: variants.name,
        nomProduit: products.name,
        typeProduit: products.productType,
        prixAchat: variants.pricePurchase,
      })
      .from(stockMovements)
      .innerJoin(variants, eq(stockMovements.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.locationId, locationId),
      ))
      .groupBy(
        stockMovements.variantId,
        variants.sku,
        variants.name,
        products.name,
        products.productType,
        variants.pricePurchase,
      );
  }

  async creerLot(data: {
    variantId: string;
    batchNumber: string;
    expiryDate: string;
    quantityRemaining: number;
  }) {
    const [lot] = await this.db.insert(batches).values(data).returning();
    return lot;
  }

  async obtenirVarianteAvecProduit(variantId: string) {
    return this.db
      .select({
        variantId: variants.id,
        productId: products.id,
        productType: products.productType,
        productName: products.name,
        tenantId: products.tenantId,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(variants.id, variantId))
      .limit(1)
      .then((rows) => rows[0]);
  }

  async obtenirHistorique(tenantId: string, opts: {
    variantId?: string; locationId?: string; limit?: number;
  }) {
    const conditions: any[] = [eq(stockMovements.tenantId, tenantId)];
    if (opts.variantId) conditions.push(eq(stockMovements.variantId, opts.variantId));
    if (opts.locationId) conditions.push(eq(stockMovements.locationId, opts.locationId));

    return this.db.query.stockMovements.findMany({
      where: and(...conditions),
      limit: opts.limit || 50,
      orderBy: sql`${stockMovements.createdAt} DESC`,
    });
  }
}
