import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type {
  ITicket, IRapportZ, IRapportVentesPeriode, IRapportMarges, IRapportTva,
} from "../types/vente.type";

const BASE = "/vente";

export const venteAPI = {
  creerTicket: (token: string, data: {
    emplacementId: string;
    remiseGlobale?: number;
    raisonRemise?: string;
    lignes: {
      varianteId: string;
      quantite: number;
      remise?: number;
      numeroSerie?: string;
      supplements?: { supplementId: string; quantite: number }[];
    }[];
    clientId?: string;
    nomClient?: string;
    telephoneClient?: string;
    note?: string;
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

  rapportVentesPeriode: (
    token: string, debut: string, fin: string, emplacementId?: string,
  ) => {
    const qs = new URLSearchParams({ debut, fin });
    if (emplacementId) qs.set("emplacementId", emplacementId);
    return httpClient.get<IRapportVentesPeriode>(`${BASE}/rapports/ventes-periode?${qs}`, { token });
  },

  rapportMarges: (
    token: string, debut: string, fin: string, emplacementId?: string,
  ) => {
    const qs = new URLSearchParams({ debut, fin });
    if (emplacementId) qs.set("emplacementId", emplacementId);
    return httpClient.get<IRapportMarges>(`${BASE}/rapports/marges?${qs}`, { token });
  },

  rapportTva: (
    token: string, debut: string, fin: string, emplacementId?: string,
  ) => {
    const qs = new URLSearchParams({ debut, fin });
    if (emplacementId) qs.set("emplacementId", emplacementId);
    return httpClient.get<IRapportTva>(`${BASE}/rapports/tva?${qs}`, { token });
  },
};
