import { httpClient } from "@/lib/http";
import type { IKpiTableauDeBord, IPointVentesJour } from "../types/dashboard.type";

const BASE = "/tableau-de-bord";

export const tableauDeBordAPI = {
  kpis: (token: string) =>
    httpClient.get<IKpiTableauDeBord>(`${BASE}/kpis`, { token }),

  ventesParJour: (token: string, jours = 7) =>
    httpClient.get<IPointVentesJour[]>(`${BASE}/ventes-par-jour?jours=${jours}`, { token }),
};
