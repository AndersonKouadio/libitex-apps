import { httpClient } from "@/lib/http";
import type { INotificationLog, IStatutProviders } from "../types/notification.type";

const BASE = "/notifications";

export const notificationAPI = {
  lister: (token: string, opts?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return httpClient.get<INotificationLog[]>(`${BASE}${qs ? `?${qs}` : ""}`, { token });
  },

  status: (token: string) =>
    httpClient.get<IStatutProviders>(`${BASE}/status`, { token }),

  /** Module 10 D3 : envoyer un bon de commande par WhatsApp au fournisseur. */
  envoyerBdC: (token: string, commandeId: string) =>
    httpClient.post<{ envoye: boolean; raison?: string }>(
      `/achats/commandes/${commandeId}/envoyer-fournisseur`, {}, { token },
    ),
};
