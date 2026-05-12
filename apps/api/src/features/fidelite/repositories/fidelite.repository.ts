import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, loyaltyConfig, loyaltyTransactions, tickets,
} from "@libitex/db";

@Injectable()
export class FideliteRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // ─── Config ───────────────────────────────────────────────────────────

  async obtenirOuCreerConfig(tenantId: string) {
    const existant = await this.db.query.loyaltyConfig.findFirst({
      where: eq(loyaltyConfig.tenantId, tenantId),
    });
    if (existant) return existant;
    const [cree] = await this.db
      .insert(loyaltyConfig)
      .values({ tenantId })
      .returning();
    return cree;
  }

  async modifierConfig(tenantId: string, data: Partial<{
    isActive: boolean;
    programName: string;
    earnAmount: string;
    redeemValue: string;
    minRedeemPoints: number;
  }>) {
    await this.obtenirOuCreerConfig(tenantId);
    const [row] = await this.db
      .update(loyaltyConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(loyaltyConfig.tenantId, tenantId))
      .returning();
    return row;
  }

  // ─── Transactions ─────────────────────────────────────────────────────

  async ajouterTransaction(data: {
    tenantId: string;
    customerId: string;
    points: number;
    transactionType: "EARN" | "REDEEM" | "ADJUST";
    ticketId?: string;
    userId?: string;
    note?: string;
  }) {
    const [row] = await this.db.insert(loyaltyTransactions).values(data).returning();
    return row;
  }

  async solde(tenantId: string, customerId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${loyaltyTransactions.points}), 0)::int` })
      .from(loyaltyTransactions)
      .where(and(
        eq(loyaltyTransactions.tenantId, tenantId),
        eq(loyaltyTransactions.customerId, customerId),
      ));
    return Number(row?.total ?? 0);
  }

  async historique(tenantId: string, customerId: string, limit = 50) {
    return this.db
      .select({
        id: loyaltyTransactions.id,
        points: loyaltyTransactions.points,
        transactionType: loyaltyTransactions.transactionType,
        ticketId: loyaltyTransactions.ticketId,
        ticketNumber: tickets.ticketNumber,
        note: loyaltyTransactions.note,
        createdAt: loyaltyTransactions.createdAt,
      })
      .from(loyaltyTransactions)
      .leftJoin(tickets, eq(loyaltyTransactions.ticketId, tickets.id))
      .where(and(
        eq(loyaltyTransactions.tenantId, tenantId),
        eq(loyaltyTransactions.customerId, customerId),
      ))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(limit);
  }
}
