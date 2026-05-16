export type SubscriptionPlan = "TRIAL" | "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";

export interface PlanLimits {
  maxBoutiques: number | null;
  maxUtilisateurs: number | null;
  maxProduits: number | null;
  maxEmplacements: number | null;
  features: {
    b2b: boolean;
    multiDevise: boolean;
    apiAccess: boolean;
    customDomain: boolean;
    marketplace: boolean;
  };
}

export interface IAbonnement {
  plan: SubscriptionPlan;
  libelle: string;
  prixMensuelFcfa: number;
  statut: SubscriptionStatus;
  trialFinitLe: string | null;
  joursRestants: number | null;
  prochaineFacturation: string | null;
  limites: PlanLimits;
  usage: {
    boutiques: number;
    utilisateurs: number;
    produits: number;
    emplacements: number;
  };
}

export interface IPlanDispo {
  plan: SubscriptionPlan;
  libelle: string;
  prixMensuelFcfa: number;
  limites: PlanLimits;
}
