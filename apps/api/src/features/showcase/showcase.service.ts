import { Injectable, NotFoundException } from "@nestjs/common";
import { ShowcaseRepository } from "./showcase.repository";

export interface BoutiquePublicDto {
  id: string;
  slug: string;
  nom: string;
  secteur: string;
  devise: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  logoUrl: string | null;
}

export interface VariantePublicDto {
  id: string;
  sku: string;
  nom: string | null;
  prixDetail: number;
  prixPromotion: number | null;
}

export interface ProduitPublicDto {
  id: string;
  nom: string;
  description: string | null;
  marque: string | null;
  categorieId: string | null;
  images: string[];
  enPromotion: boolean;
  prixPromotion: number | null;
  enRupture: boolean;
  variantes: VariantePublicDto[];
}

export interface PageProduitsPublicsDto {
  data: ProduitPublicDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoriePublicDto {
  id: string;
  nom: string;
  slug: string;
}

@Injectable()
export class ShowcaseService {
  constructor(private readonly repo: ShowcaseRepository) {}

  async obtenirBoutique(slug: string): Promise<BoutiquePublicDto> {
    const t = await this.repo.trouverBoutiqueParSlug(slug);
    if (!t) throw new NotFoundException("Boutique introuvable");
    return {
      id: t.id,
      slug: t.slug,
      nom: t.name,
      secteur: t.activitySector,
      devise: t.currency,
      email: t.email,
      telephone: t.phone,
      adresse: t.address,
      logoUrl: t.logoUrl,
    };
  }

  /**
   * Liste paginee + filtres recherche/categorie. Renvoie aussi le total
   * pour permettre une pagination cote front.
   */
  async listerProduits(
    slug: string,
    opts: { categorieId?: string; recherche?: string; limit?: number; offset?: number } = {},
  ): Promise<PageProduitsPublicsDto> {
    const t = await this.repo.trouverBoutiqueParSlug(slug);
    if (!t) throw new NotFoundException("Boutique introuvable");
    const [rows, total] = await Promise.all([
      this.repo.listerProduitsPublics(t.id, opts),
      this.repo.compterProduitsPublics(t.id, opts),
    ]);
    return {
      data: rows.map((p) => this.mapProduit(p)),
      total,
      limit: opts.limit ?? 24,
      offset: opts.offset ?? 0,
    };
  }

  async obtenirProduit(slug: string, id: string): Promise<ProduitPublicDto> {
    const t = await this.repo.trouverBoutiqueParSlug(slug);
    if (!t) throw new NotFoundException("Boutique introuvable");
    const p = await this.repo.obtenirProduitPublic(t.id, id);
    if (!p) throw new NotFoundException("Produit introuvable");
    return this.mapProduit(p);
  }

  async listerCategories(slug: string): Promise<CategoriePublicDto[]> {
    const t = await this.repo.trouverBoutiqueParSlug(slug);
    if (!t) throw new NotFoundException("Boutique introuvable");
    const rows = await this.repo.listerCategoriesPubliques(t.id);
    return rows.map((c) => ({ id: c.id, nom: c.name, slug: c.slug ?? "" }));
  }

  private mapProduit(p: any): ProduitPublicDto {
    return {
      id: p.id,
      nom: p.name,
      description: p.description,
      marque: p.brand,
      categorieId: p.categoryId,
      images: p.images ?? [],
      enPromotion: p.isPromotion ?? false,
      prixPromotion: p.promotionPrice ? Number(p.promotionPrice) : null,
      enRupture: p.outOfStock ?? false,
      variantes: (p.variantes ?? []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        nom: v.name,
        prixDetail: Number(v.priceRetail),
        prixPromotion: null,
      })),
    };
  }
}
