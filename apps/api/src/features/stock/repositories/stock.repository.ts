import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, locations, stockMovements, variants, products } from "@libitex/db";

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

  async enregistrerMouvement(data: {
    tenantId: string; variantId: string; locationId: string;
    movementType: string; quantity: number; userId: string;
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
      );
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
