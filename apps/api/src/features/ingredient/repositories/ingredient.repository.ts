import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql, desc, gte, lte, SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, ingredients, ingredientInventory, ingredientMovements, recipeLines,
  locations, users,
} from "@libitex/db";
import type { UniteMesure } from "@libitex/shared";

interface CreerIngredientData {
  tenantId: string;
  name: string;
  description?: string;
  unit: UniteMesure;
  pricePerUnit?: string;
  lowStockThreshold?: string;
}

@Injectable()
export class IngredientRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: CreerIngredientData) {
    const [ing] = await this.db.insert(ingredients).values(data).returning();
    return ing;
  }

  async modifier(tenantId: string, id: string, data: Partial<CreerIngredientData>) {
    const [ing] = await this.db
      .update(ingredients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(ingredients.id, id), eq(ingredients.tenantId, tenantId)))
      .returning();
    return ing;
  }

  async lister(tenantId: string) {
    return this.db.query.ingredients.findMany({
      where: and(eq(ingredients.tenantId, tenantId), isNull(ingredients.deletedAt)),
      orderBy: ingredients.name,
    });
  }

  async obtenir(tenantId: string, id: string) {
    return this.db.query.ingredients.findFirst({
      where: and(eq(ingredients.id, id), eq(ingredients.tenantId, tenantId)),
    });
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(ingredients)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(ingredients.id, id), eq(ingredients.tenantId, tenantId)));
  }

  // --- Stock ---

  async stockActuel(tenantId: string, ingredientId: string, locationId: string): Promise<number> {
    const row = await this.db.query.ingredientInventory.findFirst({
      where: and(
        eq(ingredientInventory.tenantId, tenantId),
        eq(ingredientInventory.ingredientId, ingredientId),
        eq(ingredientInventory.locationId, locationId),
      ),
    });
    return Number(row?.quantity ?? 0);
  }

  async stockParEmplacement(tenantId: string, locationId: string) {
    return this.db
      .select({
        ingredientId: ingredientInventory.ingredientId,
        nom: ingredients.name,
        unite: ingredients.unit,
        seuilAlerte: ingredients.lowStockThreshold,
        quantite: ingredientInventory.quantity,
      })
      .from(ingredientInventory)
      .innerJoin(ingredients, eq(ingredientInventory.ingredientId, ingredients.id))
      .where(and(
        eq(ingredientInventory.tenantId, tenantId),
        eq(ingredientInventory.locationId, locationId),
        isNull(ingredients.deletedAt),
      ));
  }

  async appliquerMouvement(data: {
    tenantId: string;
    ingredientId: string;
    locationId: string;
    type: "STOCK_IN" | "CONSUMPTION" | "ADJUSTMENT" | "WASTE" | "TRANSFER_IN" | "TRANSFER_OUT";
    quantityDelta: string;  // signed: negative for outbound
    unit: UniteMesure;
    unitCost?: string;
    reference?: string;
    note?: string;
    userId?: string;
  }) {
    await this.db.insert(ingredientMovements).values({
      tenantId: data.tenantId,
      ingredientId: data.ingredientId,
      locationId: data.locationId,
      type: data.type,
      quantity: data.quantityDelta,
      unit: data.unit,
      unitCost: data.unitCost,
      reference: data.reference,
      note: data.note,
      userId: data.userId,
    });

    // Upsert sur ingredient_inventory
    const existing = await this.db.query.ingredientInventory.findFirst({
      where: and(
        eq(ingredientInventory.tenantId, data.tenantId),
        eq(ingredientInventory.ingredientId, data.ingredientId),
        eq(ingredientInventory.locationId, data.locationId),
      ),
    });

    if (existing) {
      await this.db
        .update(ingredientInventory)
        .set({
          quantity: sql`${ingredientInventory.quantity} + ${data.quantityDelta}`,
          updatedAt: new Date(),
        })
        .where(eq(ingredientInventory.id, existing.id));
    } else {
      await this.db.insert(ingredientInventory).values({
        tenantId: data.tenantId,
        ingredientId: data.ingredientId,
        locationId: data.locationId,
        quantity: data.quantityDelta,
      });
    }
  }

  async definirStockExact(data: {
    tenantId: string;
    ingredientId: string;
    locationId: string;
    quantite: string;
    note?: string;
    userId?: string;
    unit: UniteMesure;
  }) {
    const actuel = await this.stockActuel(data.tenantId, data.ingredientId, data.locationId);
    const delta = (Number(data.quantite) - actuel).toString();

    await this.db.insert(ingredientMovements).values({
      tenantId: data.tenantId,
      ingredientId: data.ingredientId,
      locationId: data.locationId,
      type: "ADJUSTMENT",
      quantity: delta,
      unit: data.unit,
      note: data.note,
      userId: data.userId,
    });

    const existing = await this.db.query.ingredientInventory.findFirst({
      where: and(
        eq(ingredientInventory.tenantId, data.tenantId),
        eq(ingredientInventory.ingredientId, data.ingredientId),
        eq(ingredientInventory.locationId, data.locationId),
      ),
    });

    if (existing) {
      await this.db
        .update(ingredientInventory)
        .set({ quantity: data.quantite, updatedAt: new Date() })
        .where(eq(ingredientInventory.id, existing.id));
    } else {
      await this.db.insert(ingredientInventory).values({
        tenantId: data.tenantId,
        ingredientId: data.ingredientId,
        locationId: data.locationId,
        quantity: data.quantite,
      });
    }
  }

  /**
   * Liste paginee des mouvements d'ingredients avec filtres optionnels.
   * Joint la fiche ingredient, l'emplacement et l'auteur (utilisateur).
   */
  async listerMouvements(
    tenantId: string,
    filtres: {
      page: number; pageSize: number;
      type?: string; ingredientId?: string; emplacementId?: string;
      dateDebut?: Date; dateFin?: Date;
    },
  ) {
    const conditions: SQL[] = [eq(ingredientMovements.tenantId, tenantId)];
    if (filtres.type) conditions.push(eq(ingredientMovements.type, filtres.type as any));
    if (filtres.ingredientId) conditions.push(eq(ingredientMovements.ingredientId, filtres.ingredientId));
    if (filtres.emplacementId) conditions.push(eq(ingredientMovements.locationId, filtres.emplacementId));
    if (filtres.dateDebut) conditions.push(gte(ingredientMovements.createdAt, filtres.dateDebut));
    if (filtres.dateFin) conditions.push(lte(ingredientMovements.createdAt, filtres.dateFin));
    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(ingredientMovements)
      .where(where);

    const offset = (filtres.page - 1) * filtres.pageSize;
    const rows = await this.db
      .select({
        id: ingredientMovements.id,
        type: ingredientMovements.type,
        quantity: ingredientMovements.quantity,
        unit: ingredientMovements.unit,
        note: ingredientMovements.note,
        reference: ingredientMovements.reference,
        createdAt: ingredientMovements.createdAt,
        ingredientId: ingredientMovements.ingredientId,
        nomIngredient: ingredients.name,
        locationId: ingredientMovements.locationId,
        nomEmplacement: locations.name,
        userId: ingredientMovements.userId,
        prenomAuteur: users.firstName,
        nomAuteur: users.lastName,
      })
      .from(ingredientMovements)
      .innerJoin(ingredients, eq(ingredientMovements.ingredientId, ingredients.id))
      .innerJoin(locations, eq(ingredientMovements.locationId, locations.id))
      .leftJoin(users, eq(ingredientMovements.userId, users.id))
      .where(where)
      .orderBy(desc(ingredientMovements.createdAt))
      .limit(filtres.pageSize)
      .offset(offset);

    return { rows, total: Number(countRow?.total ?? 0) };
  }

  // --- Recettes (BOM) ---

  async definirRecette(variantId: string, lignes: Array<{
    ingredientId: string;
    quantity: string;
    unit: UniteMesure;
  }>) {
    await this.db.delete(recipeLines).where(eq(recipeLines.variantId, variantId));
    if (lignes.length === 0) return;
    await this.db.insert(recipeLines).values(
      lignes.map((l, i) => ({
        variantId,
        ingredientId: l.ingredientId,
        quantity: l.quantity,
        unit: l.unit,
        sortOrder: i,
      })),
    );
  }

  async obtenirRecette(variantId: string) {
    return this.db
      .select({
        id: recipeLines.id,
        ingredientId: recipeLines.ingredientId,
        nom: ingredients.name,
        quantite: recipeLines.quantity,
        unite: recipeLines.unit,
        ordre: recipeLines.sortOrder,
      })
      .from(recipeLines)
      .innerJoin(ingredients, eq(recipeLines.ingredientId, ingredients.id))
      .where(eq(recipeLines.variantId, variantId))
      .orderBy(recipeLines.sortOrder);
  }
}
