import { httpClient } from "@/lib/http";
import type { IAbonnement, IPlanDispo, SubscriptionPlan } from "../types/abonnement.type";

const BASE = "/abonnement";

export const abonnementAPI = {
  obtenir: (token: string) =>
    httpClient.get<IAbonnement>(BASE, { token }),

  listerPlans: (token: string) =>
    httpClient.get<IPlanDispo[]>(`${BASE}/plans`, { token }),

  changerPlan: (token: string, plan: SubscriptionPlan) =>
    httpClient.post<{ ok: true }>(`${BASE}/changer-plan`, { plan }, { token }),
};
