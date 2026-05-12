import { httpClient } from "@/lib/http";
import type { IReservation, IResumeReservationsJour, StatutReservation } from "../types/reservation.type";

const BASE = "/reservations";

export interface CreerReservationDTO {
  emplacementId: string;
  clientId?: string;
  nomClient: string;
  telephone?: string;
  numeroTable?: string;
  dateReservation: string;
  nombrePersonnes: number;
  notes?: string;
}

export type ModifierReservationDTO = Partial<CreerReservationDTO> & {
  statut?: StatutReservation;
};

export const reservationAPI = {
  lister: (token: string, filtres?: {
    emplacementId?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }) => {
    const qs = new URLSearchParams();
    if (filtres?.emplacementId) qs.set("emplacementId", filtres.emplacementId);
    if (filtres?.statut) qs.set("statut", filtres.statut);
    if (filtres?.dateDebut) qs.set("dateDebut", filtres.dateDebut);
    if (filtres?.dateFin) qs.set("dateFin", filtres.dateFin);
    const q = qs.toString();
    return httpClient.get<IReservation[]>(`${BASE}${q ? `?${q}` : ""}`, { token });
  },

  obtenir: (token: string, id: string) =>
    httpClient.get<IReservation>(`${BASE}/${id}`, { token }),

  creer: (token: string, data: CreerReservationDTO) =>
    httpClient.post<IReservation>(BASE, data, { token }),

  modifier: (token: string, id: string, data: ModifierReservationDTO) =>
    httpClient.patch<IReservation>(`${BASE}/${id}`, data, { token }),

  supprimer: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/${id}`, { token }),

  resumeJour: (token: string, date?: string) =>
    httpClient.get<IResumeReservationsJour>(
      `${BASE}/resume-jour${date ? `?date=${date}` : ""}`,
      { token },
    ),
};
