import type { SubscriptionPlan, SubscriptionStatus } from "@/features/abonnement/types/abonnement.type";

export interface IResumeTenant {
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

export interface IKpisGlobaux {
  nbTenants: number;
  nbTenantsActifs: number;
  nbTenantsSuspendus: number;
  nbTenantsTrial: number;
  caGlobal: number;
  nbTicketsGlobal: number;
  nbUtilisateursGlobal: number;
  distributionPlans: Record<SubscriptionPlan, number>;
}
