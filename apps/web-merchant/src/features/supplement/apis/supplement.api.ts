import { httpClient } from "@/lib/http";
import type { ISupplement } from "../types/supplement.type";
import type { CreerSupplementDTO, ModifierSupplementDTO } from "../schemas/supplement.schema";

const BASE = "/supplements";

export const supplementAPI = {
  lister: (token: string) => httpClient.get<ISupplement[]>(BASE, { token }),
  obtenir: (token: string, id: string) => httpClient.get<ISupplement>(`${BASE}/${id}`, { token }),
  creer: (token: string, data: CreerSupplementDTO) =>
    httpClient.post<ISupplement>(BASE, data, { token }),
  modifier: (token: string, id: string, data: ModifierSupplementDTO) =>
    httpClient.patch<ISupplement>(`${BASE}/${id}`, data, { token }),
  supprimer: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/${id}`, { token }),
};
