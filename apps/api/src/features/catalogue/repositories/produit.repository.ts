import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql, ilike, or, inArray } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, products, variants, categories, productLocations,
  stockMovements, recipeLines, ingredientInventory,
} from "@libitex/db";
import type { UniteMesure } from "@libitex/shared";

@Injectable()
export class ProduitRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creerProduit(tenantId: string, data: {
    name: string;
    description?: string;
    productType: "SIMPLE" | "VARIANT" | "SERIALIZED" | "PERISHABLE" | "MENU";
    categoryId?: string;
    brand?: string;
    taxRate?: string;
    images?: string[];
    sectorMetadata?: Record<string, unknown>;
    cookingTimeMinutes?: number;
    promotionPrice?: string;
    isPromotion?: boolean;
    spiceLevel?: string;
    cuisineTags?: string[];
    outOfStock?: boolean;
    availabilityMode?: "TOUJOURS" | "PROGRAMME";
    availabilitySchedule?: Record<string, Array<{ from: string; to: string }>>;
    isSupplement?: boolean;
  }) {
    const [produit] = await this.db
      .insert(products)
      .values({
        tenantId,
        ...data,
        images: data.images || [],
        sectorMetadata: data.sectorMetadata || {},
        cuisineTags: data.cuisineTags || [],
      })
      .returning();
    return produit;
  }

  async lierEmplacements(productId: string, locationIds: string[]) {
    if (locationIds.length === 0) return;
    await this.db
      .insert(productLocations)
      .values(locationIds.map((id) => ({ productId, locationId: id })))
      .onConflictDoNothing();
  }

  async remplacerEmplacements(productId: string, locationIds: string[]) {
    await this.db.delete(productLocations).where(eq(productLocations.productId, productId));
    await this.lierEmplacements(productId, locationIds);
  }

  async listerEmplacementsDuProduit(productId: string): Promise<string[]> {
    const rows = await this.db
      .select({ locationId: productLocations.locationId })
      .from(productLocations)
      .where(eq(productLocations.productId, productId));
    return rows.map((r) => r.locationId);
  }

  async creerVariante(productId: string, data: {
    sku: string;
    name?: string;
    attributes?: Record<string, string>;
    barcode?: string;
    pricePurchase?: string;
    priceRetail: string;
    priceWholesale?: string;
    priceVip?: string;
    saleUnit?: UniteMesure;
    saleStep?: string;
    pricePerUnit?: boolean;
  }) {
    const [variante] = await this.db
      .insert(variants)
      .values({ productId, ...data, attributes: data.attributes || {} })
      .returning();
    return variante;
  }

  async obtenirParId(tenantId: string, id: string) {
    return this.db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.tenantId, tenantId), isNull(products.deletedAt)),
    });
  }

  /**
   * Liste plusieurs produits par leurs ids (avec leur premiere variante chargee)
   * dans le contexte du tenant. Utilise pour resoudre les supplements ajoutes
   * a une commande au moment de la vente.
   */
  async listerParIdsAvecVariantes(tenantId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.db.query.products.findMany({
      where: and(
        inArray(products.id, ids),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
      ),
    });
    const allVariantes = await this.db.query.variants.findMany({
      where: and(
        inArray(variants.productId, rows.map((p) => p.id)),
        isNull(variants.deletedAt),
      ),
    });
    const parProduit = new Map<string, typeof allVariantes>();
    for (const v of allVariantes) {
      if (!parProduit.has(v.productId)) parProduit.set(v.productId, []);
      parProduit.get(v.productId)!.push(v);
    }
    return rows.map((p) => ({ ...p, variantes: parProduit.get(p.id) ?? [] }));
  }

  async modifierVariante(productId: string, varianteId: string, data: Partial<{
    sku: string;
    name: string;
    barcode: string;
    pricePurchase: string;
    priceRetail: string;
    priceWholesale: string;
    priceVip: string;
    saleUnit: UniteMesure;
    saleStep: string;
    pricePerUnit: boolean;
    isActive: boolean;
  }>) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const [updated] = await this.db
      .update(variants)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(and(eq(variants.id, varianteId), eq(variants.productId, productId)))
      .returning();
    return updated;
  }

  async obtenirVariantes(productId: string) {
    return this.db.query.variants.findMany({
      where: and(eq(variants.productId, productId), isNull(variants.deletedAt)),
    });
  }

  async listerProduits(
    tenantId: string,
    opts: {
      offset: number;
      limit: number;
      recherche?: string;
      isSupplement?: boolean;
      typeProduit?: string;
      categorieId?: string;
      actif?: boolean;
    },
  ) {
    const conditions = [eq(products.tenantId, tenantId), isNull(products.deletedAt)];

    if (opts.recherche) {
      conditions.push(
        or(
          ilike(products.name, `%${opts.recherche}%`),
          ilike(products.brand, `%${opts.recherche}%`),
        )!,
      );
    }

    if (opts.isSupplement !== undefined) {
      conditions.push(eq(products.isSupplement, opts.isSupplement));
    }

    if (opts.typeProduit) {
      conditions.push(eq(products.productType, opts.typeProduit as any));
    }

    if (opts.categorieId) {
      conditions.push(eq(products.categoryId, opts.categorieId));
    }

    if (opts.actif !== undefined) {
      conditions.push(eq(products.isActive, opts.actif));
    }

    const data = await this.db.query.products.findMany({
      where: and(...conditions),
      limit: opts.limit,
      offset: opts.offset,
      orderBy: products.createdAt,
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(...conditions));

    return { data, total: Number(countResult?.count ?? 0) };
  }

  async modifier(tenantId: string, id: string, data: Partial<{
    name: string;
    description: string;
    categoryId: string;
    brand: string;
    images: string[];
    sectorMetadata: Record<string, unknown>;
    cookingTimeMinutes: number;
    promotionPrice: string;
    isPromotion: boolean;
    spiceLevel: string;
    cuisineTags: string[];
    outOfStock: boolean;
    availabilityMode: "TOUJOURS" | "PROGRAMME";
    availabilitySchedule: Record<string, Array<{ from: string; to: string }>>;
    isActive: boolean;
    isSupplement: boolean;
  }>) {
    // Filtre les undefined : sinon Drizzle ecrase a NULL les champs non fournis.
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const [updated] = await this.db
      .update(products)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
  }

  // --- Categories ---

  async creerCategorie(tenantId: string, nom: string, parentId?: string) {
    const slug = nom.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [categorie] = await this.db
      .insert(categories)
      .values({ tenantId, name: nom, slug, parentId })
      .returning();
    return categorie;
  }

  async listerCategories(tenantId: string) {
    return this.db.query.categories.findMany({
      where: and(eq(categories.tenantId, tenantId), isNull(categories.deletedAt)),
      orderBy: categories.sortOrder,
    });
  }

  /**
   * Compte le nombre de produits actifs (non supprimes) rattaches a chaque
   * categorie. Renvoie une Map pour lookup en O(1) lors de l'enrichissement
   * de la liste des categories.
   */
  async compterProduitsParCategorie(tenantId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`COUNT(*)`,
      })
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
      ))
      .groupBy(products.categoryId);

    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.categoryId) map.set(r.categoryId, Number(r.count));
    }
    return map;
  }

  async trouverCategorieParId(tenantId: string, id: string) {
    return this.db.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.tenantId, tenantId),
        isNull(categories.deletedAt),
      ),
    });
  }

  async modifierCategorie(
    tenantId: string,
    id: string,
    data: Partial<{ name: string; parentId: string | null }>,
  ) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) {
      updates.name = data.name;
      updates.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (data.parentId !== undefined) updates.parentId = data.parentId;

    const [updated] = await this.db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async supprimerCategorie(tenantId: string, id: string) {
    await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));
  }

  async compterProduitsCategorie(tenantId: string, categorieId: string): Promise<number> {
    const [r] = await this.db
      .select({ n: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.categoryId, categorieId),
        isNull(products.deletedAt),
      ));
    return Number(r?.n ?? 0);
  }

  /**
   * Calcule la disponibilite de toutes les variantes pour un emplacement.
   * 3 cas :
   *  - Variantes MENU : portions = min sur chaque ingredient de
   *    floor(stock_ingredient / qty_recette). 0 si recette incomplete.
   *  - Variantes de supplement (products.isSupplement) : disponible si
   *    stock > 0, indisponible sinon.
   *  - Autres variantes : disponible si stock > 0.
   *
   * Retourne uniquement les variantes pour lesquelles il y a un blocage
   * (stock <= 0 ou portions = 0) — plus efficace que tout retourner.
   */
  async disponibilitesEmplacement(tenantId: string, locationId: string) {
    // Stock par variante (toutes non-MENU). productId inclus pour
    // pouvoir mapper supplementId (= product.id) vers rupture.
    const stocksVariantes = await this.db
      .select({
        variantId: stockMovements.variantId,
        productId: products.id,
        quantite: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
        isSupplement: products.isSupplement,
        productType: products.productType,
      })
      .from(stockMovements)
      .innerJoin(variants, eq(stockMovements.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.locationId, locationId),
      ))
      .groupBy(stockMovements.variantId, products.id, products.isSupplement, products.productType);

    // Recettes des MENU + stock ingredient correspondant
    const recettes = await this.db
      .select({
        variantId: recipeLines.variantId,
        ingredientId: recipeLines.ingredientId,
        qtyRecette: recipeLines.quantity,
        stockIng: ingredientInventory.quantity,
      })
      .from(recipeLines)
      .innerJoin(variants, eq(recipeLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .leftJoin(ingredientInventory, and(
        eq(ingredientInventory.ingredientId, recipeLines.ingredientId),
        eq(ingredientInventory.locationId, locationId),
        eq(ingredientInventory.tenantId, tenantId),
      ))
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.productType, "MENU"),
        isNull(products.deletedAt),
      ));

    // Toutes les variantes MENU declarees (meme sans recette)
    const menusToutes = await this.db
      .select({ variantId: variants.id })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.productType, "MENU"),
        isNull(products.deletedAt),
      ));

    return { stocksVariantes, recettes, menusToutes };
  }
}
