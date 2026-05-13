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

  /**
   * Module 11 D1 (fix C1) : increment atomique avec check de la limite
   * globale en meme temps. UPDATE conditionnel renvoie 0 row si la
   * limite est atteinte au moment du commit (race-safe pour 2 caissiers
   * simultanes sur le dernier usage disponible).
   *
   * Retourne true si l'increment a eu lieu, false si la limite etait
   * atteinte. Postgres garantit l'atomicite d'une seule requete UPDATE.
   */
  async incrementerUsageAtomique(id: string): Promise<boolean> {
    const rows = await this.db
      .update(promotions)
      .set({ usageCount: sql`${promotions.usageCount} + 1`, updatedAt: new Date() })
      .where(and(
        eq(promotions.id, id),
        sql`(${promotions.usageLimit} IS NULL OR ${promotions.usageCount} < ${promotions.usageLimit})`,
      ))
      .returning({ id: promotions.id });
    return rows.length > 0;
  }

  /**
   * Module 11 D2 (I4) : decremente usage_count si un ticket annule
   * apres usage doit liberer le code. Idempotent : ne descend pas
   * sous 0 (GREATEST(0, count - 1)).
   */
  async decrementerUsage(id: string): Promise<void> {
    await this.db
      .update(promotions)
      .set({
        usageCount: sql`GREATEST(0, ${promotions.usageCount} - 1)`,
        updatedAt: new Date(),
      })
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

  /**
   * Module 11 D2 : retrouver les usages d'un ticket (pour decrementer
   * si le ticket est annule apres usage).
   */
  async usagesParTicket(ticketId: string) {
    return this.db
      .select()
      .from(promotionUsages)
      .where(eq(promotionUsages.ticketId, ticketId));
  }

  async supprimerUsagesTicket(ticketId: string): Promise<void> {
    await this.db
      .delete(promotionUsages)
      .where(eq(promotionUsages.ticketId, ticketId));
  }
}
