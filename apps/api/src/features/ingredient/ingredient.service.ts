import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { IngredientUnit, INGREDIENT_UNIT_BASE } from "@libitex/shared";
import { IngredientRepository } from "./repositories/ingredient.repository";
import {
  CreerIngredientDto, ModifierIngredientDto, EntreeIngredientDto, AjustementIngredientDto,
  DefinirRecetteDto, IngredientResponseDto, StockIngredientDto, LigneRecetteResponseDto,
} from "./dto/ingredient.dto";

/**
 * Convertit une quantite + unite saisie vers l'unite de base de l'ingredient.
 * Ex: ingredient stocké en KG, on saisit 250 G → 0.25 KG.
 *     ingredient stocké en L, on saisit 500 ML → 0.5 L.
 */
function convertirVersUniteCible(
  quantite: number,
  uniteSource: IngredientUnit,
  uniteCible: IngredientUnit,
): number {
  const baseSource = INGREDIENT_UNIT_BASE[uniteSource];
  const baseCible = INGREDIENT_UNIT_BASE[uniteCible];

  if (baseSource.unit !== baseCible.unit) {
    throw new BadRequestException(
      `Conversion impossible entre ${uniteSource} et ${uniteCible}`,
    );
  }

  const enBase = quantite * baseSource.factor;
  return enBase / baseCible.factor;
}

@Injectable()
export class IngredientService {
  constructor(private readonly repo: IngredientRepository) {}

  async creer(tenantId: string, dto: CreerIngredientDto): Promise<IngredientResponseDto> {
    const ing = await this.repo.creer({
      tenantId,
      name: dto.nom,
      description: dto.description,
      unit: dto.unite,
      pricePerUnit: dto.prixUnitaire?.toString(),
      lowStockThreshold: dto.seuilAlerte?.toString(),
    });
    return this.toResponse(ing);
  }

  async lister(tenantId: string): Promise<IngredientResponseDto[]> {
    const list = await this.repo.lister(tenantId);
    return list.map((i) => this.toResponse(i));
  }

  async modifier(tenantId: string, id: string, dto: ModifierIngredientDto): Promise<IngredientResponseDto> {
    const data: Record<string, unknown> = {};
    if (dto.nom !== undefined) data.name = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.unite !== undefined) data.unit = dto.unite;
    if (dto.prixUnitaire !== undefined) data.pricePerUnit = dto.prixUnitaire.toString();
    if (dto.seuilAlerte !== undefined) data.lowStockThreshold = dto.seuilAlerte.toString();

    const ing = await this.repo.modifier(tenantId, id, data);
    if (!ing) throw new NotFoundException("Ingrédient introuvable");
    return this.toResponse(ing);
  }

  async supprimer(tenantId: string, id: string): Promise<void> {
    await this.repo.supprimer(tenantId, id);
  }

  // --- Stock ---

  async receptionner(tenantId: string, userId: string, dto: EntreeIngredientDto): Promise<void> {
    const ingredient = await this.repo.obtenir(tenantId, dto.ingredientId);
    if (!ingredient) throw new NotFoundException("Ingrédient introuvable");

    const uniteSaisie = (dto.unite ?? ingredient.unit) as IngredientUnit;
    const quantiteCible = convertirVersUniteCible(
      dto.quantite,
      uniteSaisie,
      ingredient.unit as IngredientUnit,
    );

    const unitCost = dto.coutTotal !== undefined && dto.quantite > 0
      ? (dto.coutTotal / dto.quantite).toString()
      : undefined;

    await this.repo.appliquerMouvement({
      tenantId,
      ingredientId: dto.ingredientId,
      locationId: dto.emplacementId,
      type: "STOCK_IN",
      quantityDelta: quantiteCible.toString(),
      unit: ingredient.unit as "G" | "KG" | "ML" | "L" | "PIECE",
      unitCost,
      reference: dto.reference,
      note: dto.note,
      userId,
    });
  }

  async ajuster(tenantId: string, userId: string, dto: AjustementIngredientDto): Promise<void> {
    const ingredient = await this.repo.obtenir(tenantId, dto.ingredientId);
    if (!ingredient) throw new NotFoundException("Ingrédient introuvable");

    await this.repo.definirStockExact({
      tenantId,
      ingredientId: dto.ingredientId,
      locationId: dto.emplacementId,
      quantite: dto.quantiteReelle.toString(),
      unit: ingredient.unit as "G" | "KG" | "ML" | "L" | "PIECE",
      note: dto.note,
      userId,
    });
  }

  async stockParEmplacement(tenantId: string, locationId: string): Promise<StockIngredientDto[]> {
    const list = await this.repo.stockParEmplacement(tenantId, locationId);
    return list.map((s) => {
      const quantite = Number(s.quantite ?? 0);
      const seuil = Number(s.seuilAlerte ?? 0);
      return {
        ingredientId: s.ingredientId,
        nomIngredient: s.nom,
        unite: s.unite,
        emplacementId: locationId,
        quantite,
        enAlerte: seuil > 0 && quantite <= seuil,
      };
    });
  }

  // --- Recettes ---

  async definirRecette(tenantId: string, variantId: string, dto: DefinirRecetteDto): Promise<void> {
    // Verifier que tous les ingredients appartiennent au tenant
    for (const l of dto.lignes) {
      const ing = await this.repo.obtenir(tenantId, l.ingredientId);
      if (!ing) throw new NotFoundException(`Ingrédient ${l.ingredientId} introuvable`);
    }
    await this.repo.definirRecette(
      variantId,
      dto.lignes.map((l) => ({
        ingredientId: l.ingredientId,
        quantity: l.quantite.toString(),
        unit: l.unite,
      })),
    );
  }

  async obtenirRecette(variantId: string): Promise<LigneRecetteResponseDto[]> {
    const lignes = await this.repo.obtenirRecette(variantId);
    return lignes.map((l) => ({
      id: l.id,
      ingredientId: l.ingredientId,
      nomIngredient: l.nom,
      quantite: Number(l.quantite),
      unite: l.unite,
      ordre: l.ordre ?? 0,
    }));
  }

  /** Decremente le stock des ingredients selon la recette d'une variante */
  async consommerRecette(params: {
    tenantId: string;
    userId: string;
    variantId: string;
    locationId: string;
    quantiteVendue: number;
    reference?: string;
  }): Promise<void> {
    const recette = await this.repo.obtenirRecette(params.variantId);
    for (const ligne of recette) {
      const ingredient = await this.repo.obtenir(params.tenantId, ligne.ingredientId);
      if (!ingredient) continue;

      const aConsommer = Number(ligne.quantite) * params.quantiteVendue;
      const enUniteCible = convertirVersUniteCible(
        aConsommer,
        ligne.unite as IngredientUnit,
        ingredient.unit as IngredientUnit,
      );

      await this.repo.appliquerMouvement({
        tenantId: params.tenantId,
        ingredientId: ligne.ingredientId,
        locationId: params.locationId,
        type: "CONSUMPTION",
        quantityDelta: (-enUniteCible).toString(),
        unit: ingredient.unit as "G" | "KG" | "ML" | "L" | "PIECE",
        reference: params.reference,
        userId: params.userId,
      });
    }
  }

  // --- Helpers ---

  private toResponse(ing: any): IngredientResponseDto {
    return {
      id: ing.id,
      nom: ing.name,
      description: ing.description,
      unite: ing.unit,
      prixUnitaire: Number(ing.pricePerUnit ?? 0),
      seuilAlerte: Number(ing.lowStockThreshold ?? 0),
      actif: ing.isActive,
      creeLe: ing.createdAt?.toISOString?.() ?? ing.createdAt,
    };
  }
}
