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

  historique: (token: string, customerId: string) =>
    httpClient.get<ITransactionFidelite[]>(`${BASE}/clients/${customerId}/historique`, { token }),

  ajuster: (token: string, customerId: string, points: number, note?: string) =>
    httpClient.post<void>(`${BASE}/clients/${customerId}/ajuster`, { points, note }, { token }),
};
