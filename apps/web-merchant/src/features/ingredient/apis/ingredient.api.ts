import { httpClient } from "@/lib/http";
import type {
  IIngredient, IStockIngredient, ILigneRecette,
  IMouvementIngredient, FiltreMouvementsIngredients,
} from "../types/ingredient.type";
import type {
  CreerIngredientDTO, EntreeIngredientDTO, AjustementIngredientDTO,
  TransfertIngredientDTO, DefinirRecetteDTO,
} from "../schemas/ingredient.schema";

export interface MouvementsIngredientsResponse {
  data: IMouvementIngredient[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

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

  transferer: (token: string, data: TransfertIngredientDTO) =>
    httpClient.post(`${BASE}/transfert`, data, { token }),

  stockParEmplacement: (token: string, emplacementId: string) =>
    httpClient.get<IStockIngredient[]>(`${BASE}/emplacement/${emplacementId}/stock`, { token }),

  obtenirRecette: (token: string, varianteId: string) =>
    httpClient.get<ILigneRecette[]>(`${BASE}/recettes/${varianteId}`, { token }),

  definirRecette: (token: string, varianteId: string, data: DefinirRecetteDTO) =>
    httpClient.post<void>(`${BASE}/recettes/${varianteId}`, data, { token }),

  appliquerInventaire: (token: string, data: {
    emplacementId: string; justification: string;
    lignes: Array<{ ingredientId: string; quantiteReelle: number }>;
  }) =>
    httpClient.post<{ ajustements: number; inchanges: number; total: number }>(
      `${BASE}/inventaire`, data, { token },
    ),

  listerMouvements: (token: string, filtres: FiltreMouvementsIngredients) => {
    const qs = new URLSearchParams();
    qs.set("page", String(filtres.page ?? 1));
    qs.set("pageSize", String(filtres.pageSize ?? 50));
    if (filtres.type) qs.set("type", filtres.type);
    if (filtres.ingredientId) qs.set("ingredientId", filtres.ingredientId);
    if (filtres.emplacementId) qs.set("emplacementId", filtres.emplacementId);
    if (filtres.dateDebut) qs.set("dateDebut", filtres.dateDebut);
    if (filtres.dateFin) qs.set("dateFin", filtres.dateFin);
    return httpClient.get<MouvementsIngredientsResponse>(
      `${BASE}/mouvements?${qs.toString()}`,
      { token },
    );
  },
};
