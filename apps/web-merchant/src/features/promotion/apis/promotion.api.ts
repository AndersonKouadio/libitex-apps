import { httpClient } from "@/lib/http";
import type { IPromotion, IResultatValidation, TypePromotion } from "../types/promotion.type";

const BASE = "/promotions";

export interface CreerPromotionDTO {
  code: string;
  description?: string;
  type: TypePromotion;
  valeur: number;
  montantMin?: number;
  remiseMax?: number;
  dateDebut?: string;
  dateFin?: string;
  limiteUtilisations?: number;
  limiteParClient?: number;
}

export type ModifierPromotionDTO = Partial<CreerPromotionDTO> & { actif?: boolean };

export const promotionAPI = {
  lister: (token: string) => httpClient.get<IPromotion[]>(BASE, { token }),

  creer: (token: string, data: CreerPromotionDTO) =>
    httpClient.post<IPromotion>(BASE, data, { token }),

  modifier: (token: string, id: string, data: ModifierPromotionDTO) =>
    httpClient.patch<IPromotion>(`${BASE}/${id}`, data, { token }),

  supprimer: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/${id}`, { token }),

  /**
   * Valider un code au moment ou il est saisi dans le panier POS.
   * Pas d'effet de bord : juste un check + calcul de la remise.
   */
  valider: (token: string, code: string, montantTicket: number, clientId?: string) =>
    httpClient.post<IResultatValidation>(`${BASE}/valider`, {
      code, montantTicket, clientId,
    }, { token }),
};
