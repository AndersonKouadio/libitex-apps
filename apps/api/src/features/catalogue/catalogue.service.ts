import { Injectable } from "@nestjs/common";
import { ProduitRepository } from "./repositories/produit.repository";
import { RessourceIntrouvableException } from "../../common/exceptions/metier.exception";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import {
  CreerProduitDto, ModifierProduitDto, CreerCategorieDto,
  ProduitResponseDto, VarianteResponseDto, CategorieResponseDto,
} from "./dto/produit.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class CatalogueService {
  constructor(
    private readonly produitRepo: ProduitRepository,
    private readonly audit: AuditService,
  ) {}

  async creerProduit(tenantId: string, userId: string, dto: CreerProduitDto): Promise<ProduitResponseDto> {
    const produit = await this.produitRepo.creerProduit(tenantId, {
      name: dto.nom,
      description: dto.description,
      productType: dto.typeProduit,
      categoryId: dto.categorieId,
      brand: dto.marque,
      barcodeEan13: dto.codeBarresEan13,
      taxRate: dto.tauxTva?.toString(),
      images: dto.images ?? [],
      sectorMetadata: dto.metadataSecteur ?? {},
      cookingTimeMinutes: dto.cookingTimeMinutes,
      promotionPrice: dto.prixPromotion?.toString(),
      isPromotion: dto.enPromotion,
      spiceLevel: dto.niveauEpice,
      cuisineTags: dto.tagsCuisine ?? [],
      outOfStock: dto.enRupture,
    });

    if (dto.supplementIds && dto.supplementIds.length > 0) {
      await this.produitRepo.lierSupplements(produit.id, dto.supplementIds);
    }

    const variantes: VarianteResponseDto[] = [];
    for (const v of dto.variantes) {
      const variante = await this.produitRepo.creerVariante(produit.id, {
        sku: v.sku,
        name: v.nom,
        attributes: v.attributs,
        barcode: v.codeBarres,
        pricePurchase: v.prixAchat?.toString() || "0",
        priceRetail: v.prixDetail.toString(),
        priceWholesale: v.prixGros?.toString(),
        priceVip: v.prixVip?.toString(),
        saleUnit: v.uniteVente,
        saleStep: v.pasMin?.toString(),
        pricePerUnit: v.prixParUnite,
      });
      variantes.push(this.mapVariante(variante));
    }

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.PRODUIT_CREATED,
      entityType: "PRODUIT", entityId: produit.id,
      after: { nom: produit.name, type: produit.productType, nbVariantes: variantes.length },
    });

    const supplementIds = dto.supplementIds ?? [];
    return this.mapProduit(produit, variantes, supplementIds);
  }

  async obtenirProduit(tenantId: string, id: string): Promise<ProduitResponseDto> {
    const produit = await this.produitRepo.obtenirParId(tenantId, id);
    if (!produit) throw new RessourceIntrouvableException("Produit", id);

    const [rawVariantes, supplementIds] = await Promise.all([
      this.produitRepo.obtenirVariantes(id),
      this.produitRepo.listerSupplementsDuProduit(id),
    ]);
    return this.mapProduit(produit, rawVariantes.map((v) => this.mapVariante(v)), supplementIds);
  }

  async listerProduits(
    tenantId: string, page: number, limit: number, recherche?: string,
  ): Promise<PaginatedResponseDto<ProduitResponseDto>> {
    const offset = (page - 1) * limit;
    const { data, total } = await this.produitRepo.listerProduits(tenantId, offset, limit, recherche);

    const produits = await Promise.all(
      data.map(async (p) => {
        const [rawVariantes, supplementIds] = await Promise.all([
          this.produitRepo.obtenirVariantes(p.id),
          this.produitRepo.listerSupplementsDuProduit(p.id),
        ]);
        return this.mapProduit(p, rawVariantes.map((v) => this.mapVariante(v)), supplementIds);
      }),
    );

    return PaginatedResponseDto.create(produits, total, page, limit);
  }

  async modifierProduit(tenantId: string, userId: string, id: string, dto: ModifierProduitDto): Promise<ProduitResponseDto> {
    const avant = await this.obtenirProduit(tenantId, id); // verifie existence

    const updated = await this.produitRepo.modifier(tenantId, id, {
      name: dto.nom,
      description: dto.description,
      categoryId: dto.categorieId,
      brand: dto.marque,
      images: dto.images,
      sectorMetadata: dto.metadataSecteur,
      cookingTimeMinutes: dto.cookingTimeMinutes,
      promotionPrice: dto.prixPromotion?.toString(),
      isPromotion: dto.enPromotion,
      spiceLevel: dto.niveauEpice,
      cuisineTags: dto.tagsCuisine,
      outOfStock: dto.enRupture,
      isActive: dto.actif,
    });

    if (dto.supplementIds !== undefined) {
      await this.produitRepo.remplacerSupplements(id, dto.supplementIds);
    }

    await this.audit.logUpdate(
      tenantId, userId, "PRODUIT", id,
      { nom: avant.nom, marque: avant.marque, actif: avant.actif },
      { nom: updated.name, marque: updated.brand, actif: updated.isActive },
    );

    const [rawVariantes, supplementIds] = await Promise.all([
      this.produitRepo.obtenirVariantes(id),
      this.produitRepo.listerSupplementsDuProduit(id),
    ]);
    return this.mapProduit(updated, rawVariantes.map((v) => this.mapVariante(v)), supplementIds);
  }

  async supprimerProduit(tenantId: string, userId: string, id: string): Promise<void> {
    const avant = await this.obtenirProduit(tenantId, id);
    await this.produitRepo.supprimer(tenantId, id);
    await this.audit.logDelete(tenantId, userId, "PRODUIT", id, {
      nom: avant.nom, type: avant.typeProduit,
    });
  }

  async creerCategorie(tenantId: string, dto: CreerCategorieDto): Promise<CategorieResponseDto> {
    const cat = await this.produitRepo.creerCategorie(tenantId, dto.nom, dto.parentId);
    return { id: cat.id, nom: cat.name, slug: cat.slug, parentId: cat.parentId };
  }

  async listerCategories(tenantId: string): Promise<CategorieResponseDto[]> {
    const cats = await this.produitRepo.listerCategories(tenantId);
    return cats.map((c) => ({ id: c.id, nom: c.name, slug: c.slug, parentId: c.parentId }));
  }

  // --- Mappers (DB -> DTO reponse) ---

  private mapProduit(
    raw: any,
    variantes: VarianteResponseDto[],
    supplementIds: string[] = [],
  ): ProduitResponseDto {
    return {
      id: raw.id,
      nom: raw.name,
      description: raw.description,
      typeProduit: raw.productType,
      marque: raw.brand,
      categorieId: raw.categoryId,
      tauxTva: Number(raw.taxRate ?? 0),
      images: Array.isArray(raw.images) ? raw.images : [],
      metadataSecteur: (raw.sectorMetadata && typeof raw.sectorMetadata === "object")
        ? raw.sectorMetadata as Record<string, unknown>
        : {},
      // Restauration
      cookingTimeMinutes: raw.cookingTimeMinutes ?? null,
      prixPromotion: raw.promotionPrice !== null && raw.promotionPrice !== undefined
        ? Number(raw.promotionPrice)
        : null,
      enPromotion: raw.isPromotion ?? false,
      niveauEpice: raw.spiceLevel ?? null,
      tagsCuisine: Array.isArray(raw.cuisineTags) ? raw.cuisineTags : [],
      enRupture: raw.outOfStock ?? false,
      supplementIds,
      // Communs
      actif: raw.isActive,
      variantes,
      creeLe: raw.createdAt?.toISOString?.() ?? raw.createdAt,
    };
  }

  private mapVariante(raw: any): VarianteResponseDto {
    return {
      id: raw.id,
      sku: raw.sku,
      nom: raw.name,
      attributs: raw.attributes ?? {},
      codeBarres: raw.barcode,
      prixAchat: Number(raw.pricePurchase ?? 0),
      prixDetail: Number(raw.priceRetail),
      prixGros: raw.priceWholesale ? Number(raw.priceWholesale) : null,
      prixVip: raw.priceVip ? Number(raw.priceVip) : null,
      uniteVente: raw.saleUnit,
      pasMin: raw.saleStep != null ? Number(raw.saleStep) : null,
      prixParUnite: Boolean(raw.pricePerUnit),
    };
  }
}
