import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, loyaltyConfig, loyaltyTransactions, tickets, customers,
} from "@libitex/db";

@Injectable()
export class FideliteRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // ─── Config ───────────────────────────────────────────────────────────

  /**
   * Recupere la config fidelite du tenant ou la cree avec les defauts.
   *
   * Fix C5 : utilise INSERT ... ON CONFLICT DO NOTHING pour eviter la
   * race condition "find then insert" (2 callers simultanes pouvaient
   * passer le find et tenter 2 inserts, l'un echouait sur la contrainte
   * UNIQUE(tenantId)). Le ON CONFLICT degrade silencieusement et on
   * relit la ligne existante.
   */
  async obtenirOuCreerConfig(tenantId: string) {
    // Tente l'insert ; si conflit, on retombe sur le SELECT.
    const [insere] = await this.db
      .insert(loyaltyConfig)
      .values({ tenantId })
      .onConflictDoNothing({ target: loyaltyConfig.tenantId })
      .returning();
    if (insere) return insere;
    const existant = await this.db.query.loyaltyConfig.findFirst({
      where: eq(loyaltyConfig.tenantId, tenantId),
    });
    if (!existant) {
      // Ne devrait jamais arriver (ON CONFLICT garantit l'existence),
      // mais defense en profondeur.
      throw new Error(`Config fidelite introuvable pour tenant ${tenantId}`);
    }
    return existant;
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

  // ─── Validations tenant ───────────────────────────────────────────────

  /**
   * Fix C3 + I2 : verifie que `customerId` appartient au `tenantId`.
   * Retourne true si ok. Permet au service de rejeter les attaques
   * cross-tenant (un attaquant qui devine un UUID d'un autre tenant).
   */
  async clientAppartientTenant(tenantId: string, customerId: string): Promise<boolean> {
    const row = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.tenantId, tenantId),
        isNull(customers.deletedAt),
      ),
    });
    return !!row;
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

  /**
   * Historique des transactions d'un client. Pagine via limit/offset.
   * Fix I8 : avant, limit=50 hardcode -> les clients fideles avaient
   * leurs anciennes transactions invisibles. Maintenant le caller passe
   * la pagination explicitement.
   */
  async historique(
    tenantId: string,
    customerId: string,
    opts: { limit?: number; offset?: number } = {},
  ) {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);
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
      .limit(limit)
      .offset(offset);
  }

  /**
   * Fix C4 : detecte les violations de la contrainte UNIQUE sur
   * (tenantId, customerId, ticketId, transactionType). Permet au caller
   * de degrader proprement (idempotence : la transaction existe deja,
   * pas besoin de retry).
   */
  estViolationUniqueLoyalty(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const e = err as { code?: string; constraint?: string; message?: string };
    if (e.code !== "23505") return false;
    const id = e.constraint ?? e.message ?? "";
    return id.includes("loyalty_tx_unique") || id.includes("loyalty_transactions");
  }
}
