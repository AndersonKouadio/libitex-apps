import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql, desc, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, promotions, promotionUsages,
} from "@libitex/db";

@Injectable()
export class PromotionRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: {
    tenantId: string;
    code: string;
    description?: string;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: string;
    minPurchaseAmount?: string;
    maxDiscountAmount?: string | null;
    validFrom?: Date | null;
    validTo?: Date | null;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    isActive?: boolean;
  }) {
    const [row] = await this.db.insert(promotions).values(data).returning();
    return row;
  }

  async lister(tenantId: string) {
    return this.db
      .select()
      .from(promotions)
      .where(and(
        eq(promotions.tenantId, tenantId),
        isNull(promotions.deletedAt),
      ))
      .orderBy(desc(promotions.createdAt));
  }

  async trouverParId(tenantId: string, id: string) {
    return this.db.query.promotions.findFirst({
      where: and(
        eq(promotions.id, id),
        eq(promotions.tenantId, tenantId),
        isNull(promotions.deletedAt),
      ),
    });
  }

  /**
   * Lookup case-insensitive par code. Sert au moment de la validation au
   * panier. Le code est normalise UPPER(...) au moment de l'insert/update
   * cote service pour eviter les doublons "MOIS10" / "mois10".
   */
  async trouverParCode(tenantId: string, code: string) {
    const row = await this.db
      .select()
      .from(promotions)
      .where(and(
        eq(promotions.tenantId, tenantId),
        sql`UPPER(${promotions.code}) = ${code.toUpperCase()}`,
        isNull(promotions.deletedAt),
      ))
      .limit(1);
    return row[0];
  }

  async modifier(tenantId: string, id: string, data: Partial<{
    code: string;
    description: string | null;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: string;
    minPurchaseAmount: string;
    maxDiscountAmount: string | null;
    validFrom: Date | null;
    validTo: Date | null;
    usageLimit: number | null;
    perCustomerLimit: number | null;
    isActive: boolean;
  }>) {
    const [row] = await this.db
      .update(promotions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)))
      .returning();
    return row;
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(promotions)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)));
  }

  async incrementerUsage(id: string) {
    await this.db
      .update(promotions)
      .set({ usageCount: sql`${promotions.usageCount} + 1`, updatedAt: new Date() })
      .where(eq(promotions.id, id));
  }

  async compterUsagesClient(promotionId: string, customerId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(promotionUsages)
      .where(and(
        eq(promotionUsages.promotionId, promotionId),
        eq(promotionUsages.customerId, customerId),
      ));
    return Number(row?.n ?? 0);
  }

  async enregistrerUsage(data: {
    promotionId: string;
    tenantId: string;
    customerId?: string;
    ticketId?: string;
    discountAmount: string;
  }) {
    const [row] = await this.db.insert(promotionUsages).values(data).returning();
    return row;
  }
}
