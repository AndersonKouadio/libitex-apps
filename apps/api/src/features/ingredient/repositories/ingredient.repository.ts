import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, ingredients, ingredientInventory, ingredientMovements, recipeLines,
} from "@libitex/db";

interface CreerIngredientData {
  tenantId: string;
  name: string;
  description?: string;
  unit: "G" | "KG" | "ML" | "L" | "PIECE";
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
    unit: "G" | "KG" | "ML" | "L" | "PIECE";
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
    unit: "G" | "KG" | "ML" | "L" | "PIECE";
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

  // --- Recettes (BOM) ---

  async definirRecette(variantId: string, lignes: Array<{
    ingredientId: string;
    quantity: string;
    unit: "G" | "KG" | "ML" | "L" | "PIECE";
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
