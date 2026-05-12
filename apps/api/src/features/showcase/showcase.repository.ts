import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, asc } from "drizzle-orm";
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
   * - hors MENU si pas de variante (mais on garde les MENU avec variantes pour
   *   les restaurateurs : un menu visible = ses variantes/recettes)
   */
  async listerProduitsPublics(tenantId: string, categorieId?: string) {
    const conditions = [
      eq(products.tenantId, tenantId),
      eq(products.isActive, true),
      eq(products.isSupplement, false),
      isNull(products.deletedAt),
    ];
    if (categorieId) conditions.push(eq(products.categoryId, categorieId));

    const rows = await this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.name));

    if (rows.length === 0) return [];

    // Variantes actives pour chacun
    const allVariantes = await this.db.query.variants.findMany({
      where: and(
        isNull(variants.deletedAt),
        eq(variants.isActive, true),
      ),
    });
    const parProduit = new Map<string, typeof allVariantes>();
    for (const v of allVariantes) {
      if (!rows.some((p) => p.id === v.productId)) continue;
      if (!parProduit.has(v.productId)) parProduit.set(v.productId, []);
      parProduit.get(v.productId)!.push(v);
    }
    return rows.map((p) => ({ ...p, variantes: parProduit.get(p.id) ?? [] }));
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
