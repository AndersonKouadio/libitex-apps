import { httpClient } from "@/lib/http";
import type { SubscriptionPlan, SubscriptionStatus } from "@/features/abonnement/types/abonnement.type";
import type { IResumeTenant, IKpisGlobaux } from "../types/super-admin.type";

const BASE = "/super-admin";

export const superAdminAPI = {
  listerTenants: (token: string, recherche?: string) =>
    httpClient.get<IResumeTenant[]>(
      `${BASE}/tenants${recherche ? `?recherche=${encodeURIComponent(recherche)}` : ""}`,
      { token },
    ),

  kpisGlobaux: (token: string) =>
    httpClient.get<IKpisGlobaux>(`${BASE}/kpis`, { token }),

  basculerStatut: (token: string, tenantId: string, statut: SubscriptionStatus) =>
    httpClient.patch<{ ok: true }>(`${BASE}/tenants/${tenantId}/statut`, { statut }, { token }),

  forcerPlan: (token: string, tenantId: string, plan: SubscriptionPlan) =>
    httpClient.patch<{ ok: true }>(`${BASE}/tenants/${tenantId}/plan`, { plan }, { token }),
};
