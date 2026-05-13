import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql, desc, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, promotions, promotionUsages, tickets, customers,
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

  /**
   * Module 11 D3 : stats consolidees pour un code promo.
   * Une seule query : nb_usages, total_remise distribue, CA genere
   * (somme des ticket.total APRES remise — montant reellement encaisse).
   *
   * Pour aller plus loin, on pourrait calculer le CA avant remise = total + discountAmount
   * mais total apres remise est plus pertinent (volume de business directement attribuable).
   */
  async obtenirStats(tenantId: string, promotionId: string) {
    const [row] = await this.db
      .select({
        nbUsages: sql<number>`COUNT(*)::int`,
        totalRemise: sql<number>`COALESCE(SUM(CAST(${promotionUsages.discountAmount} AS NUMERIC)), 0)`,
        caGenere: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
      })
      .from(promotionUsages)
      .leftJoin(tickets, eq(promotionUsages.ticketId, tickets.id))
      .where(and(
        eq(promotionUsages.tenantId, tenantId),
        eq(promotionUsages.promotionId, promotionId),
      ));
    return {
      nbUsages: Number(row?.nbUsages ?? 0),
      totalRemise: Number(row?.totalRemise ?? 0),
      caGenere: Number(row?.caGenere ?? 0),
    };
  }

  /**
   * Module 11 D3 : top 5 clients ayant utilise le code (par nombre d'usages).
   * Joint avec customers pour avoir le nom. Exclut les usages sans client lie.
   */
  async obtenirTopClients(tenantId: string, promotionId: string, limit = 5) {
    return this.db
      .select({
        customerId: promotionUsages.customerId,
        nom: customers.firstName,
        prenom: customers.lastName,
        nbUsages: sql<number>`COUNT(*)::int`,
        totalRemise: sql<number>`COALESCE(SUM(CAST(${promotionUsages.discountAmount} AS NUMERIC)), 0)`,
      })
      .from(promotionUsages)
      .innerJoin(customers, eq(promotionUsages.customerId, customers.id))
      .where(and(
        eq(promotionUsages.tenantId, tenantId),
        eq(promotionUsages.promotionId, promotionId),
      ))
      .groupBy(promotionUsages.customerId, customers.firstName, customers.lastName)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);
  }
}
