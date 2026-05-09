import { Injectable, BadRequestException } from "@nestjs/common";
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
      taxRate: dto.tauxTva?.toString(),
      images: dto.images ?? [],
      sectorMetadata: dto.metadataSecteur ?? {},
      cookingTimeMinutes: dto.cookingTimeMinutes,
      promotionPrice: dto.prixPromotion?.toString(),
      isPromotion: dto.enPromotion,
      spiceLevel: dto.niveauEpice,
      cuisineTags: dto.tagsCuisine ?? [],
      outOfStock: dto.enRupture,
      availabilityMode: dto.modeDisponibilite,
      availabilitySchedule: dto.planningDisponibilite,
      isSupplement: dto.isSupplement,
    });

    if (dto.emplacementsDisponibles && dto.emplacementsDisponibles.length > 0) {
      await this.produitRepo.lierEmplacements(produit.id, dto.emplacementsDisponibles);
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

    const emplacementsDisponibles = dto.emplacementsDisponibles ?? [];
    return this.mapProduit(produit, variantes, emplacementsDisponibles);
  }

  async obtenirProduit(tenantId: string, id: string): Promise<ProduitResponseDto> {
    const produit = await this.produitRepo.obtenirParId(tenantId, id);
    if (!produit) throw new RessourceIntrouvableException("Produit", id);

    const [rawVariantes, emplacementsDisponibles] = await Promise.all([
      this.produitRepo.obtenirVariantes(id),
      this.produitRepo.listerEmplacementsDuProduit(id),
    ]);
    return this.mapProduit(
      produit,
      rawVariantes.map((v) => this.mapVariante(v)),
      emplacementsDisponibles,
    );
  }

  async listerProduits(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      recherche?: string;
      isSupplement?: boolean;
      typeProduit?: string;
      categorieId?: string;
      actif?: boolean;
    },
  ): Promise<PaginatedResponseDto<ProduitResponseDto>> {
    const offset = (opts.page - 1) * opts.limit;
    const { data, total } = await this.produitRepo.listerProduits(tenantId, {
      offset,
      limit: opts.limit,
      recherche: opts.recherche,
      isSupplement: opts.isSupplement,
      typeProduit: opts.typeProduit,
      categorieId: opts.categorieId,
      actif: opts.actif,
    });

    const produits = await Promise.all(
      data.map(async (p) => {
        const [rawVariantes, emplacementsDisponibles] = await Promise.all([
          this.produitRepo.obtenirVariantes(p.id),
          this.produitRepo.listerEmplacementsDuProduit(p.id),
        ]);
        return this.mapProduit(
          p,
          rawVariantes.map((v) => this.mapVariante(v)),
          emplacementsDisponibles,
        );
      }),
    );

    return PaginatedResponseDto.create(produits, total, opts.page, opts.limit);
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
      availabilityMode: dto.modeDisponibilite,
      availabilitySchedule: dto.planningDisponibilite,
      isActive: dto.actif,
      isSupplement: dto.isSupplement,
    });

    if (dto.emplacementsDisponibles !== undefined) {
      await this.produitRepo.remplacerEmplacements(id, dto.emplacementsDisponibles);
    }

    await this.audit.logUpdate(
      tenantId, userId, "PRODUIT", id,
      { nom: avant.nom, marque: avant.marque, actif: avant.actif },
      { nom: updated.name, marque: updated.brand, actif: updated.isActive },
    );

    const [rawVariantes, emplacementsDisponibles] = await Promise.all([
      this.produitRepo.obtenirVariantes(id),
      this.produitRepo.listerEmplacementsDuProduit(id),
    ]);
    return this.mapProduit(
      updated,
      rawVariantes.map((v) => this.mapVariante(v)),
      emplacementsDisponibles,
    );
  }

  async supprimerProduit(tenantId: string, userId: string, id: string): Promise<void> {
    const avant = await this.obtenirProduit(tenantId, id);
    await this.produitRepo.supprimer(tenantId, id);
    await this.audit.logDelete(tenantId, userId, "PRODUIT", id, {
      nom: avant.nom, type: avant.typeProduit,
    });
  }

  async modifierVariante(
    tenantId: string, userId: string, produitId: string, varianteId: string, dto: any,
  ): Promise<VarianteResponseDto> {
    // Verifier que le produit appartient au tenant.
    const produit = await this.produitRepo.obtenirParId(tenantId, produitId);
    if (!produit) throw new RessourceIntrouvableException("Produit", produitId);

    const updated = await this.produitRepo.modifierVariante(produitId, varianteId, {
      sku: dto.sku,
      name: dto.nom,
      barcode: dto.codeBarres,
      pricePurchase: dto.prixAchat?.toString(),
      priceRetail: dto.prixDetail?.toString(),
      priceWholesale: dto.prixGros?.toString(),
      priceVip: dto.prixVip?.toString(),
      isActive: dto.actif,
    });
    if (!updated) throw new RessourceIntrouvableException("Variante", varianteId);

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.PRODUIT_UPDATED,
      entityType: "VARIANTE", entityId: varianteId,
      after: { sku: updated.sku, prixDetail: updated.priceRetail },
    });

    return this.mapVariante(updated);
  }

  async creerCategorie(tenantId: string, dto: CreerCategorieDto): Promise<CategorieResponseDto> {
    if (dto.parentId) {
      const parent = await this.produitRepo.trouverCategorieParId(tenantId, dto.parentId);
      if (!parent) throw new RessourceIntrouvableException("Catégorie parent", dto.parentId);
    }
    const cat = await this.produitRepo.creerCategorie(tenantId, dto.nom, dto.parentId);
    return { id: cat.id, nom: cat.name, slug: cat.slug, parentId: cat.parentId, nombreProduits: 0 };
  }

  async listerCategories(tenantId: string): Promise<CategorieResponseDto[]> {
    const [cats, compteurs] = await Promise.all([
      this.produitRepo.listerCategories(tenantId),
      this.produitRepo.compterProduitsParCategorie(tenantId),
    ]);
    return cats.map((c) => ({
      id: c.id,
      nom: c.name,
      slug: c.slug,
      parentId: c.parentId,
      nombreProduits: compteurs.get(c.id) ?? 0,
    }));
  }

  async modifierCategorie(
    tenantId: string,
    id: string,
    dto: { nom?: string; parentId?: string },
  ): Promise<CategorieResponseDto> {
    const existante = await this.produitRepo.trouverCategorieParId(tenantId, id);
    if (!existante) throw new RessourceIntrouvableException("Catégorie", id);
    if (dto.parentId === id) {
      throw new BadRequestException("Une catégorie ne peut pas être son propre parent");
    }
    if (dto.parentId) {
      const parent = await this.produitRepo.trouverCategorieParId(tenantId, dto.parentId);
      if (!parent) throw new RessourceIntrouvableException("Catégorie parent", dto.parentId);
    }
    const updated = await this.produitRepo.modifierCategorie(tenantId, id, {
      name: dto.nom,
      parentId: dto.parentId === "" ? null : dto.parentId,
    });
    const compteurs = await this.produitRepo.compterProduitsParCategorie(tenantId);
    return {
      id: updated.id, nom: updated.name, slug: updated.slug, parentId: updated.parentId,
      nombreProduits: compteurs.get(updated.id) ?? 0,
    };
  }

  async supprimerCategorie(tenantId: string, id: string): Promise<void> {
    const existante = await this.produitRepo.trouverCategorieParId(tenantId, id);
    if (!existante) throw new RessourceIntrouvableException("Catégorie", id);
    const nbProduits = await this.produitRepo.compterProduitsCategorie(tenantId, id);
    if (nbProduits > 0) {
      throw new BadRequestException(
        `Impossible de supprimer : ${nbProduits} produit${nbProduits > 1 ? "s" : ""} appartiennent encore à cette catégorie. Réaffectez-les d'abord.`,
      );
    }
    await this.produitRepo.supprimerCategorie(tenantId, id);
  }

  // --- Mappers (DB -> DTO reponse) ---

  private mapProduit(
    raw: any,
    variantes: VarianteResponseDto[],
    emplacementsDisponibles: string[] = [],
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
      modeDisponibilite: (raw.availabilityMode ?? "TOUJOURS") as "TOUJOURS" | "PROGRAMME",
      planningDisponibilite: (raw.availabilitySchedule && typeof raw.availabilitySchedule === "object")
        ? raw.availabilitySchedule
        : {},
      emplacementsDisponibles,
      // Communs
      actif: raw.isActive,
      isSupplement: raw.isSupplement ?? false,
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
