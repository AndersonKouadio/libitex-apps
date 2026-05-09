import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type {
  ISessionCaisse, IRecapitulatifFermeture, FondParMethode,
} from "../types/session-caisse.type";

const BASE = "/vente/sessions";

export const sessionCaisseAPI = {
  ouvrir: (token: string, data: {
    emplacementId: string;
    fondInitial: Partial<FondParMethode>;
    commentaire?: string;
  }) =>
    httpClient.post<ISessionCaisse>(BASE, data, { token }),

  active: (token: string, emplacementId: string) =>
    httpClient.get<ISessionCaisse | null>(`${BASE}/active?emplacementId=${emplacementId}`, { token }),

  recapitulatif: (token: string, sessionId: string) =>
    httpClient.get<IRecapitulatifFermeture>(`${BASE}/${sessionId}/recapitulatif`, { token }),

  fermer: (token: string, sessionId: string, data: {
    fondFinalDeclare: Partial<FondParMethode>;
    commentaire?: string;
  }) =>
    httpClient.post<ISessionCaisse>(`${BASE}/${sessionId}/fermer`, data, { token }),

  obtenir: (token: string, sessionId: string) =>
    httpClient.get<ISessionCaisse>(`${BASE}/${sessionId}`, { token }),

  lister: (token: string, params?: {
    emplacementId?: string;
    caissierId?: string;
    statut?: "OPEN" | "CLOSED";
    dateDebut?: string;
    dateFin?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.emplacementId) qs.set("emplacementId", params.emplacementId);
    if (params?.caissierId) qs.set("caissierId", params.caissierId);
    if (params?.statut) qs.set("statut", params.statut);
    if (params?.dateDebut) qs.set("dateDebut", params.dateDebut);
    if (params?.dateFin) qs.set("dateFin", params.dateFin);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return httpClient.get<PaginatedResponse<ISessionCaisse>>(`${BASE}${q ? `?${q}` : ""}`, { token });
  },

  // Endpoint cote vente (reporter ticket parqué)
  reporterTicket: (token: string, ticketId: string) =>
    httpClient.patch(`/vente/tickets/${ticketId}/reporter`, undefined, { token }),

  // Rapport Z d'une session
  rapportZ: (token: string, sessionId: string) =>
    httpClient.get(`/vente/sessions/${sessionId}/rapport-z`, { token }),
};
