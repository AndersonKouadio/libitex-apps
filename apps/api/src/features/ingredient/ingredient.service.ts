import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { UniteMesure, convertirVersUnite } from "@libitex/shared";
import { IngredientRepository } from "./repositories/ingredient.repository";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import {
  CreerIngredientDto, ModifierIngredientDto, EntreeIngredientDto, AjustementIngredientDto,
  TransfertIngredientDto, DefinirRecetteDto, IngredientResponseDto, StockIngredientDto,
  LigneRecetteResponseDto,
} from "./dto/ingredient.dto";

/**
 * Convertit une quantite saisie vers l'unite de base de l'ingredient.
 * Wrapper qui transforme l'erreur generique en BadRequestException Nest.
 */
function convertirOuRejeter(
  quantite: number,
  source: UniteMesure,
  cible: UniteMesure,
): number {
  try {
    return convertirVersUnite(quantite, source, cible);
  } catch (e) {
    throw new BadRequestException((e as Error).message);
  }
}

@Injectable()
export class IngredientService {
  constructor(
    private readonly repo: IngredientRepository,
    private readonly audit: AuditService,
  ) {}

  async creer(tenantId: string, userId: string, dto: CreerIngredientDto): Promise<IngredientResponseDto> {
    const ing = await this.repo.creer({
      tenantId,
      name: dto.nom,
      description: dto.description,
      unit: dto.unite,
      pricePerUnit: dto.prixUnitaire?.toString(),
      lowStockThreshold: dto.seuilAlerte?.toString(),
    });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.INGREDIENT_CREATED,
      entityType: "INGREDIENT", entityId: ing.id,
      after: { nom: ing.name, unite: ing.unit },
    });
    return this.toResponse(ing);
  }

  async lister(tenantId: string): Promise<IngredientResponseDto[]> {
    const list = await this.repo.lister(tenantId);
    return list.map((i) => this.toResponse(i));
  }

  async modifier(tenantId: string, userId: string, id: string, dto: ModifierIngredientDto): Promise<IngredientResponseDto> {
    const avant = await this.repo.obtenir(tenantId, id);
    if (!avant) throw new NotFoundException("Ingrédient introuvable");

    const data: Record<string, unknown> = {};
    if (dto.nom !== undefined) data.name = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.unite !== undefined) data.unit = dto.unite;
    if (dto.prixUnitaire !== undefined) data.pricePerUnit = dto.prixUnitaire.toString();
    if (dto.seuilAlerte !== undefined) data.lowStockThreshold = dto.seuilAlerte.toString();

    const ing = await this.repo.modifier(tenantId, id, data);
    if (!ing) throw new NotFoundException("Ingrédient introuvable");

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.INGREDIENT_UPDATED,
      entityType: "INGREDIENT", entityId: id,
      before: { nom: avant.name, unite: avant.unit, prix: avant.pricePerUnit },
      after: { nom: ing.name, unite: ing.unit, prix: ing.pricePerUnit },
    });
    return this.toResponse(ing);
  }

  async supprimer(tenantId: string, userId: string, id: string): Promise<void> {
    const avant = await this.repo.obtenir(tenantId, id);
    if (!avant) throw new NotFoundException("Ingrédient introuvable");
    await this.repo.supprimer(tenantId, id);
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.INGREDIENT_DELETED,
      entityType: "INGREDIENT", entityId: id,
      before: { nom: avant.name, unite: avant.unit },
    });
  }

  // --- Stock ---

  async receptionner(tenantId: string, userId: string, dto: EntreeIngredientDto): Promise<void> {
    const ingredient = await this.repo.obtenir(tenantId, dto.ingredientId);
    if (!ingredient) throw new NotFoundException("Ingrédient introuvable");

    const uniteSaisie = (dto.unite ?? ingredient.unit) as UniteMesure;
    const quantiteCible = convertirOuRejeter(
      dto.quantite,
      uniteSaisie,
      ingredient.unit as UniteMesure,
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
      unit: ingredient.unit as UniteMesure,
      unitCost,
      reference: dto.reference,
      note: dto.note,
      userId,
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.INGREDIENT_RECEIVED,
      entityType: "INGREDIENT", entityId: dto.ingredientId,
      after: {
        emplacementId: dto.emplacementId,
        quantiteSaisie: dto.quantite,
        uniteSaisie: uniteSaisie,
        quantiteEnUniteIngredient: quantiteCible,
        coutTotal: dto.coutTotal,
        reference: dto.reference,
      },
    });
  }

  async transferer(tenantId: string, userId: string, dto: TransfertIngredientDto): Promise<void> {
    if (dto.depuisEmplacementId === dto.versEmplacementId) {
      throw new BadRequestException("Les emplacements source et destination doivent être différents.");
    }
    const ingredient = await this.repo.obtenir(tenantId, dto.ingredientId);
    if (!ingredient) throw new NotFoundException("Ingrédient introuvable");

    const stockSource = await this.repo.stockActuel(
      tenantId, dto.ingredientId, dto.depuisEmplacementId,
    );
    if (stockSource < dto.quantite) {
      throw new BadRequestException(
        `Stock insuffisant à la source (${stockSource} ${ingredient.unit}). Demandé : ${dto.quantite}.`,
      );
    }

    const unit = ingredient.unit as UniteMesure;
    await this.repo.appliquerMouvement({
      tenantId, ingredientId: dto.ingredientId, locationId: dto.depuisEmplacementId,
      type: "TRANSFER_OUT", quantityDelta: (-dto.quantite).toString(),
      unit, note: dto.note, userId,
    });
    await this.repo.appliquerMouvement({
      tenantId, ingredientId: dto.ingredientId, locationId: dto.versEmplacementId,
      type: "TRANSFER_IN", quantityDelta: dto.quantite.toString(),
      unit, note: dto.note, userId,
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_TRANSFERRED,
      entityType: "INGREDIENT", entityId: dto.ingredientId,
      after: {
        depuisEmplacementId: dto.depuisEmplacementId,
        versEmplacementId: dto.versEmplacementId,
        quantite: dto.quantite,
        unite: ingredient.unit,
        note: dto.note,
      },
    });
  }

  async ajuster(tenantId: string, userId: string, dto: AjustementIngredientDto): Promise<void> {
    const ingredient = await this.repo.obtenir(tenantId, dto.ingredientId);
    if (!ingredient) throw new NotFoundException("Ingrédient introuvable");

    const stockAvant = await this.repo.stockActuel(tenantId, dto.ingredientId, dto.emplacementId);

    await this.repo.definirStockExact({
      tenantId,
      ingredientId: dto.ingredientId,
      locationId: dto.emplacementId,
      quantite: dto.quantiteReelle.toString(),
      unit: ingredient.unit as UniteMesure,
      note: dto.note,
      userId,
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.INGREDIENT_ADJUSTED,
      entityType: "INGREDIENT", entityId: dto.ingredientId,
      before: { quantiteAvant: stockAvant },
      after: {
        emplacementId: dto.emplacementId,
        quantiteApres: dto.quantiteReelle,
        unite: ingredient.unit,
        note: dto.note,
      },
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
      const enUniteCible = convertirOuRejeter(
        aConsommer,
        ligne.unite as UniteMesure,
        ingredient.unit as UniteMesure,
      );

      await this.repo.appliquerMouvement({
        tenantId: params.tenantId,
        ingredientId: ligne.ingredientId,
        locationId: params.locationId,
        type: "CONSUMPTION",
        quantityDelta: (-enUniteCible).toString(),
        unit: ingredient.unit as UniteMesure,
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
