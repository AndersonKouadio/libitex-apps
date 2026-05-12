import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, inArray, asc, ilike, or, sql, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import {
  type Database, tenants, products, variants, categories,
} from "@libitex/db";

@Injectable()
export class ShowcaseRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /** Resoud un tenant a partir de son slug public. Filtre soft-delete + actif. */
  async trouverBoutiqueParSlug(slug: string) {
    return this.db.query.tenants.findFirst({
      where: and(
        eq(tenants.slug, slug),
        eq(tenants.isActive, true),
        isNull(tenants.deletedAt),
      ),
    });
  }

  /**
   * Produits publics de la boutique. Filtres :
   * - actifs + non supprimes
   * - hors supplements (un client ne commande pas un supplement seul)
   *
   * Fix C2 : avant on chargeait TOUTES les variantes actives du systeme
   * puis on filtrait en JS. Avec 5000 produits x 3 variantes ca faisait
   * 15k rows DL pour rien. Maintenant on filtre directement par
   * `inArray(variantId, productIds)`.
   *
   * Fix I2 (D3) : pagination via limit/offset.
   */
  async listerProduitsPublics(
    tenantId: string,
    opts: { categorieId?: string; recherche?: string; limit?: number; offset?: number } = {},
  ) {
    const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);

    const conditions: SQL[] = [
      eq(products.tenantId, tenantId),
      eq(products.isActive, true),
      eq(products.isSupplement, false),
      isNull(products.deletedAt),
    ];
    if (opts.categorieId) conditions.push(eq(products.categoryId, opts.categorieId));
    if (opts.recherche && opts.recherche.length >= 2) {
      conditions.push(or(
        ilike(products.name, `%${opts.recherche}%`),
        ilike(products.brand, `%${opts.recherche}%`),
      )!);
    }

    const rows = await this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.name))
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) return [];

    // Fix C2 : charge uniquement les variantes des produits listes.
    const productIds = rows.map((p) => p.id);
    const variantesAttachees = await this.db.query.variants.findMany({
      where: and(
        inArray(variants.productId, productIds),
        isNull(variants.deletedAt),
        eq(variants.isActive, true),
      ),
    });
    const parProduit = new Map<string, typeof variantesAttachees>();
    for (const v of variantesAttachees) {
      if (!parProduit.has(v.productId)) parProduit.set(v.productId, []);
      parProduit.get(v.productId)!.push(v);
    }
    return rows.map((p) => ({ ...p, variantes: parProduit.get(p.id) ?? [] }));
  }

  /**
   * Compte les produits publics (utilise pour pagination cote front).
   */
  async compterProduitsPublics(
    tenantId: string,
    opts: { categorieId?: string; recherche?: string } = {},
  ): Promise<number> {
    const conditions: SQL[] = [
      eq(products.tenantId, tenantId),
      eq(products.isActive, true),
      eq(products.isSupplement, false),
      isNull(products.deletedAt),
    ];
    if (opts.categorieId) conditions.push(eq(products.categoryId, opts.categorieId));
    if (opts.recherche && opts.recherche.length >= 2) {
      conditions.push(or(
        ilike(products.name, `%${opts.recherche}%`),
        ilike(products.brand, `%${opts.recherche}%`),
      )!);
    }
    const [row] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(...conditions));
    return Number(row?.total ?? 0);
  }

  async obtenirProduitPublic(tenantId: string, id: string) {
    const produit = await this.db.query.products.findFirst({
      where: and(
        eq(products.id, id),
        eq(products.tenantId, tenantId),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    });
    if (!produit) return null;
    const rawVariantes = await this.db.query.variants.findMany({
      where: and(
        eq(variants.productId, id),
        eq(variants.isActive, true),
        isNull(variants.deletedAt),
      ),
    });
    return { ...produit, variantes: rawVariantes };
  }

  async listerCategoriesPubliques(tenantId: string) {
    return this.db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(asc(categories.name));
  }
}
