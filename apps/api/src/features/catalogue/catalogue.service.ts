import { Injectable } from "@nestjs/common";
import { ProduitRepository } from "./repositories/produit.repository";
import { RessourceIntrouvableException } from "../../common/exceptions/metier.exception";
import {
  CreerProduitDto, ModifierProduitDto, CreerCategorieDto,
  ProduitResponseDto, VarianteResponseDto, CategorieResponseDto,
} from "./dto/produit.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class CatalogueService {
  constructor(private readonly produitRepo: ProduitRepository) {}

  async creerProduit(tenantId: string, dto: CreerProduitDto): Promise<ProduitResponseDto> {
    const produit = await this.produitRepo.creerProduit(tenantId, {
      name: dto.nom,
      description: dto.description,
      productType: dto.typeProduit,
      categoryId: dto.categorieId,
      brand: dto.marque,
      barcodeEan13: dto.codeBarresEan13,
      taxRate: dto.tauxTva?.toString(),
    });

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
      });
      variantes.push(this.mapVariante(variante));
    }

    return this.mapProduit(produit, variantes);
  }

  async obtenirProduit(tenantId: string, id: string): Promise<ProduitResponseDto> {
    const produit = await this.produitRepo.obtenirParId(tenantId, id);
    if (!produit) throw new RessourceIntrouvableException("Produit", id);

    const rawVariantes = await this.produitRepo.obtenirVariantes(id);
    return this.mapProduit(produit, rawVariantes.map((v) => this.mapVariante(v)));
  }

  async listerProduits(
    tenantId: string, page: number, limit: number, recherche?: string,
  ): Promise<PaginatedResponseDto<ProduitResponseDto>> {
    const offset = (page - 1) * limit;
    const { data, total } = await this.produitRepo.listerProduits(tenantId, offset, limit, recherche);

    const produits = await Promise.all(
      data.map(async (p) => {
        const rawVariantes = await this.produitRepo.obtenirVariantes(p.id);
        return this.mapProduit(p, rawVariantes.map((v) => this.mapVariante(v)));
      }),
    );

    return PaginatedResponseDto.create(produits, total, page, limit);
  }

  async modifierProduit(tenantId: string, id: string, dto: ModifierProduitDto): Promise<ProduitResponseDto> {
    await this.obtenirProduit(tenantId, id); // verifie existence

    const updated = await this.produitRepo.modifier(tenantId, id, {
      name: dto.nom,
      description: dto.description,
      categoryId: dto.categorieId,
      brand: dto.marque,
      isActive: dto.actif,
    });

    const rawVariantes = await this.produitRepo.obtenirVariantes(id);
    return this.mapProduit(updated, rawVariantes.map((v) => this.mapVariante(v)));
  }

  async supprimerProduit(tenantId: string, id: string): Promise<void> {
    await this.obtenirProduit(tenantId, id);
    await this.produitRepo.supprimer(tenantId, id);
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

  private mapProduit(raw: any, variantes: VarianteResponseDto[]): ProduitResponseDto {
    return {
      id: raw.id,
      nom: raw.name,
      description: raw.description,
      typeProduit: raw.productType,
      marque: raw.brand,
      categorieId: raw.categoryId,
      tauxTva: Number(raw.taxRate ?? 0),
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
    };
  }
}
