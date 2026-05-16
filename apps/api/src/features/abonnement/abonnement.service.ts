import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { eq, and, sql, isNull, count } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import {
  type Database, tenants, memberships, products, locations,
} from "@libitex/db";
import {
  SubscriptionPlan, SubscriptionStatus, PLAN_LIMITS, PLAN_LABELS,
  PLAN_PRICES_FCFA, TRIAL_DURATION_DAYS, type PlanLimits,
} from "@libitex/shared";

export interface UsageActuel {
  boutiques: number;
  utilisateurs: number;
  produits: number;
  emplacements: number;
}

export interface AbonnementResponse {
  plan: SubscriptionPlan;
  libelle: string;
  prixMensuelFcfa: number;
  statut: SubscriptionStatus;
  trialFinitLe: string | null;
  joursRestants: number | null;
  prochaineFacturation: string | null;
  limites: PlanLimits;
  usage: UsageActuel;
}

@Injectable()
export class AbonnementService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Retourne l'etat de l'abonnement pour un tenant : plan actif, limites,
   * usage actuel (nb boutiques/users/produits/emplacements), trial restant.
   */
  async obtenirAbonnement(tenantId: string): Promise<AbonnementResponse> {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) throw new BadRequestException("Boutique introuvable");

    const plan = (tenant.subscriptionPlan ?? SubscriptionPlan.TRIAL) as SubscriptionPlan;
    const limites = PLAN_LIMITS[plan];
    const usage = await this.calculerUsage(tenantId);

    const joursRestants = tenant.trialEndsAt
      ? Math.max(0, Math.floor((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : null;

    return {
      plan,
      libelle: PLAN_LABELS[plan],
      prixMensuelFcfa: PLAN_PRICES_FCFA[plan],
      statut: (tenant.subscriptionStatus ?? SubscriptionStatus.TRIAL) as SubscriptionStatus,
      trialFinitLe: tenant.trialEndsAt?.toISOString?.() ?? null,
      joursRestants,
      prochaineFacturation: tenant.subscriptionRenewsAt?.toISOString?.() ?? null,
      limites,
      usage,
    };
  }

  /**
   * Verifie qu'un tenant peut creer une nouvelle ressource du type donne
   * sans depasser sa limite. Leve BadRequest avec un message utilisateur si
   * limite atteinte. A appeler dans les services CRUD avant insert.
   */
  async verifierLimite(
    tenantId: string,
    ressource: "boutiques" | "utilisateurs" | "produits" | "emplacements",
  ): Promise<void> {
    const [tenant] = await this.db.select({ plan: tenants.subscriptionPlan, statut: tenants.subscriptionStatus })
      .from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) throw new BadRequestException("Boutique introuvable");

    // Si suspendu, on bloque toute creation.
    if (tenant.statut === SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException("Abonnement suspendu. Régularisez votre situation pour reprendre l'activité.");
    }

    const plan = (tenant.plan ?? SubscriptionPlan.TRIAL) as SubscriptionPlan;
    const limites = PLAN_LIMITS[plan];

    const cle = ressource === "boutiques" ? "maxBoutiques"
      : ressource === "utilisateurs" ? "maxUtilisateurs"
      : ressource === "produits" ? "maxProduits"
      : "maxEmplacements";

    const max = limites[cle];
    if (max === null) return; // Illimite, OK

    const usage = await this.compterRessource(tenantId, ressource);
    if (usage >= max) {
      throw new BadRequestException(
        `Limite atteinte : ${max} ${ressource} max sur le plan ${PLAN_LABELS[plan]}. Passez à un plan supérieur pour en ajouter.`,
      );
    }
  }

  /**
   * Demarre une periode trial de 14j a l'inscription. A appeler dans la
   * creation initiale de tenant.
   */
  async initialiserTrial(tenantId: string): Promise<void> {
    const trialFin = new Date();
    trialFin.setUTCDate(trialFin.getUTCDate() + TRIAL_DURATION_DAYS);
    await this.db.update(tenants)
      .set({
        subscriptionPlan: SubscriptionPlan.TRIAL,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: trialFin,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  }

  /**
   * Change le plan d'un tenant (upgrade/downgrade). Reset le statut a ACTIVE
   * et programme la prochaine facturation a +30j.
   */
  async changerPlan(tenantId: string, nouveauPlan: SubscriptionPlan): Promise<void> {
    const renouvellement = new Date();
    renouvellement.setUTCDate(renouvellement.getUTCDate() + 30);
    await this.db.update(tenants)
      .set({
        subscriptionPlan: nouveauPlan,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionRenewsAt: renouvellement,
        trialEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  }

  /**
   * Liste tous les plans disponibles avec leurs limites + prix. Pour la
   * page d'upgrade affichant la grille de comparaison.
   */
  listerPlans(): Array<{
    plan: SubscriptionPlan;
    libelle: string;
    prixMensuelFcfa: number;
    limites: PlanLimits;
  }> {
    return Object.values(SubscriptionPlan)
      .filter((p) => p !== SubscriptionPlan.TRIAL) // Trial pas selectionnable
      .map((plan) => ({
        plan,
        libelle: PLAN_LABELS[plan],
        prixMensuelFcfa: PLAN_PRICES_FCFA[plan],
        limites: PLAN_LIMITS[plan],
      }));
  }

  private async calculerUsage(tenantId: string): Promise<UsageActuel> {
    const [boutiques, utilisateurs, produitsCnt, emplacements] = await Promise.all([
      // Une "boutique" = un tenant ici (multi-tenant, pas multi-boutique
      // dans une meme tenant). On compte les memberships ADMIN/owner pour
      // approximer le nombre de boutiques liees a cet utilisateur — mais
      // pour le scope d'un tenant unique, c'est toujours 1.
      Promise.resolve(1),
      this.compterRessource(tenantId, "utilisateurs"),
      this.compterRessource(tenantId, "produits"),
      this.compterRessource(tenantId, "emplacements"),
    ]);
    return { boutiques, utilisateurs, produits: produitsCnt, emplacements };
  }

  private async compterRessource(
    tenantId: string,
    ressource: "boutiques" | "utilisateurs" | "produits" | "emplacements",
  ): Promise<number> {
    if (ressource === "utilisateurs") {
      const [row] = await this.db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(memberships)
        .where(eq(memberships.tenantId, tenantId));
      return Number(row?.n ?? 0);
    }
    if (ressource === "produits") {
      const [row] = await this.db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), isNull(products.deletedAt)));
      return Number(row?.n ?? 0);
    }
    if (ressource === "emplacements") {
      const [row] = await this.db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(locations)
        .where(and(eq(locations.tenantId, tenantId), isNull(locations.deletedAt)));
      return Number(row?.n ?? 0);
    }
    return 1; // boutiques = 1 par tenant
  }
}
