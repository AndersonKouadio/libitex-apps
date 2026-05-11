import { httpClient } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api.type";
import type { IClient, IKpisClient, IHistoriqueClient } from "../types/client.type";
import type { CreerClientDTO } from "../schemas/client.schema";

const BASE = "/clients";

export const clientAPI = {
  lister: (
    token: string,
    params: { page?: number; recherche?: string; segment?: string } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.recherche) qs.set("recherche", params.recherche);
    if (params.segment) qs.set("segment", params.segment);
    return httpClient.get<PaginatedResponse<IClient>>(`${BASE}?${qs}`, { token });
  },

  obtenir: (token: string, id: string) =>
    httpClient.get<IClient>(`${BASE}/${id}`, { token }),

  creer: (token: string, data: CreerClientDTO) =>
    httpClient.post<IClient>(BASE, data, { token }),

  modifier: (token: string, id: string, data: Partial<CreerClientDTO>) =>
    httpClient.patch<IClient>(`${BASE}/${id}`, data, { token }),

  supprimer: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/${id}`, { token }),

  kpis: (token: string, id: string) =>
    httpClient.get<IKpisClient>(`${BASE}/${id}/kpis`, { token }),

  historique: (token: string, id: string, page = 1, pageSize = 25) =>
    httpClient.get<IHistoriqueClient>(`${BASE}/${id}/historique?page=${page}&pageSize=${pageSize}`, { token }),
};
