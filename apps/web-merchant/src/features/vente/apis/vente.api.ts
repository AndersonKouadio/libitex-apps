import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type { ITicket, IRapportZ } from "../types/vente.type";

const BASE = "/vente";

export const venteAPI = {
  creerTicket: (token: string, data: {
    emplacementId: string;
    lignes: { varianteId: string; quantite: number; numeroSerie?: string }[];
    nomClient?: string;
    telephoneClient?: string;
  }) =>
    httpClient.post<ITicket>(`${BASE}/tickets`, data, { token }),

  completerTicket: (token: string, ticketId: string, data: {
    paiements: { methode: string; montant: number; reference?: string }[];
  }) =>
    httpClient.post<ITicket & { monnaie: number }>(`${BASE}/tickets/${ticketId}/completer`, data, { token }),

  mettreEnAttente: (token: string, ticketId: string) =>
    httpClient.patch<ITicket>(`${BASE}/tickets/${ticketId}/attente`, undefined, { token }),

  annuler: (token: string, ticketId: string) =>
    httpClient.patch<ITicket>(`${BASE}/tickets/${ticketId}/annuler`, undefined, { token }),

  obtenirTicket: (token: string, ticketId: string) =>
    httpClient.get<ITicket>(`${BASE}/tickets/${ticketId}`, { token }),

  listerTickets: (token: string, params?: { emplacementId?: string; statut?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.emplacementId) qs.set("emplacementId", params.emplacementId);
    if (params?.statut) qs.set("statut", params.statut);
    if (params?.page) qs.set("page", String(params.page));
    return httpClient.get<PaginatedResponse<ITicket>>(`${BASE}/tickets?${qs}`, { token });
  },

  rapportZ: (token: string, emplacementId: string, date?: string) =>
    httpClient.get<IRapportZ>(`${BASE}/rapport-z/${emplacementId}${date ? `?date=${date}` : ""}`, { token }),
};
