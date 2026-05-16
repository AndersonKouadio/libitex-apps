import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq, sql, desc, isNull, and, ilike, or } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import {
  type Database, tenants, memberships, products, tickets, users, locations,
} from "@libitex/db";
import {
  SubscriptionPlan, SubscriptionStatus, PLAN_LABELS,
} from "@libitex/shared";

export interface ResumeTenantSuperAdmin {
  id: string;
  nom: string;
  slug: string;
  email: string | null;
  secteurActivite: string;
  plan: SubscriptionPlan;
  planLibelle: string;
  statut: SubscriptionStatus;
  isActive: boolean;
  trialFinitLe: string | null;
  joursRestants: number | null;
  creeLe: string;
  nbUtilisateurs: number;
  nbProduits: number;
  nbTickets: number;
  caTotal: number;
}

export interface KpisGlobauxSuperAdmin {
  nbTenants: number;
  nbTenantsActifs: number;
  nbTenantsSuspendus: number;
  nbTenantsTrial: number;
  caGlobal: number;
  nbTicketsGlobal: number;
  nbUtilisateursGlobal: number;
  distributionPlans: Record<SubscriptionPlan, number>;
}

@Injectable()
export class SuperAdminService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Liste tous les tenants de la plateforme avec leurs metriques cles
   * (CA, nb tickets, plan, statut). Pour la dashboard super-admin.
   */
  async listerTenants(recherche?: string): Promise<ResumeTenantSuperAdmin[]> {
    const conditions: any[] = [isNull(tenants.deletedAt)];
    if (recherche) {
      conditions.push(
        or(
          ilike(tenants.name, `%${recherche}%`),
          ilike(tenants.slug, `%${recherche}%`),
          ilike(tenants.email, `%${recherche}%`),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: tenants.id,
        nom: tenants.name,
        slug: tenants.slug,
        email: tenants.email,
        secteurActivite: tenants.activitySector,
        plan: tenants.subscriptionPlan,
        statut: tenants.subscriptionStatus,
        isActive: tenants.isActive,
        trialFinitLe: tenants.trialEndsAt,
        creeLe: tenants.createdAt,
      })
      .from(tenants)
      .where(and(...conditions))
      .orderBy(desc(tenants.createdAt));

    // Pour chaque tenant, calculer les agregats. Pour eviter N+1, on
    // ferait un seul gros SQL avec subqueries, mais ici la liste reste
    // courte (< 100 tenants typiquement) donc Promise.all est acceptable.
    return Promise.all(rows.map(async (t) => {
      const [u, p, tCount] = await Promise.all([
        this.compterUtilisateurs(t.id),
        this.compterProduits(t.id),
        this.statsTickets(t.id),
      ]);
      const plan = (t.plan ?? SubscriptionPlan.TRIAL) as SubscriptionPlan;
      const joursRestants = t.trialFinitLe
        ? Math.max(0, Math.floor((new Date(t.trialFinitLe).getTime() - Date.now()) / 86_400_000))
        : null;
      return {
        id: t.id,
        nom: t.nom,
        slug: t.slug,
        email: t.email,
        secteurActivite: t.secteurActivite,
        plan,
        planLibelle: PLAN_LABELS[plan],
        statut: (t.statut ?? SubscriptionStatus.TRIAL) as SubscriptionStatus,
        isActive: t.isActive,
        trialFinitLe: t.trialFinitLe?.toISOString?.() ?? null,
        joursRestants,
        creeLe: t.creeLe.toISOString?.() ?? String(t.creeLe),
        nbUtilisateurs: u,
        nbProduits: p,
        nbTickets: tCount.nb,
        caTotal: tCount.ca,
      };
    }));
  }

  /**
   * KPIs globaux de la plateforme : nb tenants par statut, CA total,
   * distribution des plans. Pour la home dashboard super-admin.
   */
  async kpisGlobaux(): Promise<KpisGlobauxSuperAdmin> {
    const rows = await this.db
      .select({
        plan: tenants.subscriptionPlan,
        statut: tenants.subscriptionStatus,
      })
      .from(tenants)
      .where(isNull(tenants.deletedAt));

    const distributionPlans: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.TRIAL]: 0,
      [SubscriptionPlan.STARTER]: 0,
      [SubscriptionPlan.PRO]: 0,
      [SubscriptionPlan.BUSINESS]: 0,
      [SubscriptionPlan.ENTERPRISE]: 0,
    };
    let nbActifs = 0;
    let nbSuspendus = 0;
    let nbTrial = 0;
    for (const r of rows) {
      distributionPlans[r.plan as SubscriptionPlan] += 1;
      if (r.statut === SubscriptionStatus.ACTIVE) nbActifs += 1;
      else if (r.statut === SubscriptionStatus.SUSPENDED) nbSuspendus += 1;
      else if (r.statut === SubscriptionStatus.TRIAL) nbTrial += 1;
    }

    const [caRow] = await this.db
      .select({
        ca: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        nb: sql<number>`COUNT(*)::int`,
      })
      .from(tickets)
      .where(eq(tickets.status, "COMPLETED"));

    const [usersRow] = await this.db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(isNull(users.deletedAt));

    return {
      nbTenants: rows.length,
      nbTenantsActifs: nbActifs,
      nbTenantsSuspendus: nbSuspendus,
      nbTenantsTrial: nbTrial,
      caGlobal: Number(caRow?.ca ?? 0),
      nbTicketsGlobal: Number(caRow?.nb ?? 0),
      nbUtilisateursGlobal: Number(usersRow?.n ?? 0),
      distributionPlans,
    };
  }

  /**
   * Suspend ou reactive un tenant. Quand suspendu, les utilisateurs ne
   * peuvent plus creer de ressources (verifie par AbonnementService).
   */
  async basculerStatut(tenantId: string, nouveauStatut: SubscriptionStatus): Promise<void> {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) throw new BadRequestException("Boutique introuvable");

    await this.db.update(tenants)
      .set({
        subscriptionStatus: nouveauStatut,
        // Si suspension, on flag aussi isActive=false par defense en profondeur
        isActive: nouveauStatut !== SubscriptionStatus.SUSPENDED,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  }

  /**
   * Force le plan d'un tenant (override admin). Utile pour offrir un mois
   * gratuit, downgrader pour cas litigieux, etc.
   */
  async forcerPlan(tenantId: string, plan: SubscriptionPlan): Promise<void> {
    await this.db.update(tenants)
      .set({
        subscriptionPlan: plan,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  }

  private async compterUtilisateurs(tenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId));
    return Number(row?.n ?? 0);
  }

  private async compterProduits(tenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), isNull(products.deletedAt)));
    return Number(row?.n ?? 0);
  }

  private async statsTickets(tenantId: string): Promise<{ nb: number; ca: number }> {
    const [row] = await this.db
      .select({
        nb: sql<number>`COUNT(*)::int`,
        ca: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
      })
      .from(tickets)
      .where(and(eq(tickets.tenantId, tenantId), eq(tickets.status, "COMPLETED")));
    return { nb: Number(row?.nb ?? 0), ca: Number(row?.ca ?? 0) };
  }
}
