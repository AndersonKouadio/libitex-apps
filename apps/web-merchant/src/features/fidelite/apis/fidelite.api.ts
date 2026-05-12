import { httpClient } from "@/lib/http";
import type { IConfigFidelite, ISoldeFidelite, ITransactionFidelite } from "../types/fidelite.type";

const BASE = "/fidelite";

export const fideliteAPI = {
  obtenirConfig: (token: string) =>
    httpClient.get<IConfigFidelite>(`${BASE}/config`, { token }),

  modifierConfig: (token: string, data: Partial<IConfigFidelite>) =>
    httpClient.patch<IConfigFidelite>(`${BASE}/config`, data, { token }),

  solde: (token: string, customerId: string) =>
    httpClient.get<ISoldeFidelite>(`${BASE}/clients/${customerId}/solde`, { token }),

  historique: (token: string, customerId: string, opts?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts?.offset !== undefined) qs.set("offset", String(opts.offset));
    const suffix = qs.toString() ? `?${qs}` : "";
    return httpClient.get<ITransactionFidelite[]>(`${BASE}/clients/${customerId}/historique${suffix}`, { token });
  },

  ajuster: (token: string, customerId: string, points: number, note?: string) =>
    httpClient.post<void>(`${BASE}/clients/${customerId}/ajuster`, { points, note }, { token }),
};
