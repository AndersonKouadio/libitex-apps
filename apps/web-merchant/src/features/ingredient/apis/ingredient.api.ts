import { httpClient } from "@/lib/http";
import type { IIngredient, IStockIngredient, ILigneRecette } from "../types/ingredient.type";
import type {
  CreerIngredientDTO, EntreeIngredientDTO, AjustementIngredientDTO, DefinirRecetteDTO,
} from "../schemas/ingredient.schema";

const BASE = "/ingredients";

export const ingredientAPI = {
  lister: (token: string) =>
    httpClient.get<IIngredient[]>(BASE, { token }),

  creer: (token: string, data: CreerIngredientDTO) =>
    httpClient.post<IIngredient>(BASE, data, { token }),

  modifier: (token: string, id: string, data: Partial<CreerIngredientDTO>) =>
    httpClient.patch<IIngredient>(`${BASE}/${id}`, data, { token }),

  supprimer: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/${id}`, { token }),

  receptionner: (token: string, data: EntreeIngredientDTO) =>
    httpClient.post(`${BASE}/reception`, data, { token }),

  ajuster: (token: string, data: AjustementIngredientDTO) =>
    httpClient.post(`${BASE}/ajustement`, data, { token }),

  stockParEmplacement: (token: string, emplacementId: string) =>
    httpClient.get<IStockIngredient[]>(`${BASE}/emplacement/${emplacementId}/stock`, { token }),

  obtenirRecette: (token: string, varianteId: string) =>
    httpClient.get<ILigneRecette[]>(`${BASE}/recettes/${varianteId}`, { token }),

  definirRecette: (token: string, varianteId: string, data: DefinirRecetteDTO) =>
    httpClient.post<void>(`${BASE}/recettes/${varianteId}`, data, { token }),
};
