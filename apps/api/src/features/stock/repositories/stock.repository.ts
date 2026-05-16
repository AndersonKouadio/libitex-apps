import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, isNull, desc, gte, lte, SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, locations, stockMovements, variants, products, batches, users,
} from "@libitex/db";

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

  /**
   * Liste paginee des mouvements de stock pour un tenant, avec filtres
   * optionnels (type, variante, emplacement, plage de dates) et joins
   * pour retourner les noms produit / variante / emplacement / auteur.
   */
  async listerMouvements(
    tenantId: string,
    filtres: {
      page: number; pageSize: number;
      type?: string; varianteId?: string; emplacementId?: string;
      dateDebut?: Date; dateFin?: Date;
    },
  ) {
    const conditions: SQL[] = [eq(stockMovements.tenantId, tenantId)];
    if (filtres.type) conditions.push(eq(stockMovements.movementType, filtres.type as any));
    if (filtres.varianteId) conditions.push(eq(stockMovements.variantId, filtres.varianteId));
    if (filtres.emplacementId) conditions.push(eq(stockMovements.locationId, filtres.emplacementId));
    if (filtres.dateDebut) conditions.push(gte(stockMovements.createdAt, filtres.dateDebut));
    if (filtres.dateFin) conditions.push(lte(stockMovements.createdAt, filtres.dateFin));
    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(stockMovements)
      .where(where);

    const offset = (filtres.page - 1) * filtres.pageSize;
    const rows = await this.db
      .select({
        id: stockMovements.id,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
        variantId: stockMovements.variantId,
        sku: variants.sku,
        nomVariante: variants.name,
        nomProduit: products.name,
        locationId: stockMovements.locationId,
        nomEmplacement: locations.name,
        userId: stockMovements.userId,
        prenomAuteur: users.firstName,
        nomAuteur: users.lastName,
      })
      .from(stockMovements)
      .innerJoin(variants, eq(stockMovements.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .innerJoin(locations, eq(stockMovements.locationId, locations.id))
      .leftJoin(users, eq(stockMovements.userId, users.id))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(filtres.pageSize)
      .offset(offset);

    return { rows, total: Number(countRow?.total ?? 0) };
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

  /**
   * Agrege le stock par variante sur tous les emplacements du tenant.
   * Utilise pour calculer le nombre d'alertes global (badge sidebar).
   * Filtre MENU (n'ont pas de stock propre) et supplements en option.
   */
  async stockAgregeTenant(tenantId: string) {
    return this.db
      .select({
        variantId: stockMovements.variantId,
        quantite: sql<number>`SUM(${stockMovements.quantity})`,
        typeProduit: products.productType,
      })
      .from(stockMovements)
      .innerJoin(variants, eq(stockMovements.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(stockMovements.tenantId, tenantId))
      .groupBy(stockMovements.variantId, products.productType);
  }

  /**
   * Retourne les variantes en rupture (qte <= 0) ou en alerte (qte <= seuil)
   * avec leurs noms — pour l'affichage dans le dropdown de la cloche.
   * Exclut les MENU (pas de stock propre).
   */
  async stockAlertesDetaille(tenantId: string, seuilAlerte = 10) {
    const rows = await this.db
      .select({
        variantId: stockMovements.variantId,
        sku: variants.sku,
        nomProduit: products.name,
        nomVariante: variants.name,
        typeProduit: products.productType,
        quantite: sql<number>`SUM(${stockMovements.quantity})`,
      })
      .from(stockMovements)
      .innerJoin(variants, eq(stockMovements.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(stockMovements.tenantId, tenantId))
      .groupBy(
        stockMovements.variantId, variants.sku, products.name,
        variants.name, products.productType,
      );

    return rows
      .filter((r) => r.typeProduit !== "MENU" && Number(r.quantite) <= seuilAlerte)
      .map((r) => ({
        variantId: r.variantId,
        sku: r.sku,
        nomProduit: r.nomProduit,
        nomVariante: r.nomVariante,
        typeProduit: r.typeProduit,
        quantite: Number(r.quantite),
        estRupture: Number(r.quantite) <= 0,
      }))
      .sort((a, b) => a.quantite - b.quantite); // ruptures en premier
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

  /**
   * Lots PERISHABLE expirant dans les `joursAvant` jours OU deja expires,
   * avec quantite restante > 0. Joint variants + products pour affichage.
   * Tri du plus urgent (deja expire) au moins urgent.
   */
  async lotsPerimeBientot(tenantId: string, joursAvant = 7) {
    const seuilDate = new Date();
    seuilDate.setUTCDate(seuilDate.getUTCDate() + joursAvant);
    const seuilIso = seuilDate.toISOString().split("T")[0]!;

    const rows = await this.db
      .select({
        batchId: batches.id,
        variantId: batches.variantId,
        batchNumber: batches.batchNumber,
        expiryDate: batches.expiryDate,
        quantiteRestante: batches.quantityRemaining,
        sku: variants.sku,
        nomProduit: products.name,
        nomVariante: variants.name,
      })
      .from(batches)
      .innerJoin(variants, eq(batches.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(
        eq(products.tenantId, tenantId),
        sql`${batches.quantityRemaining} > 0`,
        sql`${batches.expiryDate} <= ${seuilIso}`,
      ))
      .orderBy(batches.expiryDate);

    return rows;
  }

  /**
   * Recherche une variante par SKU dans le scope tenant. Utilise par l'import
   * stock initial pour resoudre les SKU CSV en variantId.
   */
  async trouverVarianteParSku(tenantId: string, sku: string) {
    return this.db
      .select({
        variantId: variants.id,
        productId: products.id,
        productType: products.productType,
        productName: products.name,
        sku: variants.sku,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(eq(products.tenantId, tenantId), eq(variants.sku, sku)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  /**
   * Recherche un emplacement par nom (insensible casse) dans le scope tenant.
   * Utilise par l'import stock initial pour resoudre nomEmplacement -> id.
   */
  async trouverEmplacementParNom(tenantId: string, nom: string) {
    return this.db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(and(
        eq(locations.tenantId, tenantId),
        isNull(locations.deletedAt),
        sql`LOWER(${locations.name}) = LOWER(${nom})`,
      ))
      .limit(1)
      .then((rows) => rows[0]);
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
