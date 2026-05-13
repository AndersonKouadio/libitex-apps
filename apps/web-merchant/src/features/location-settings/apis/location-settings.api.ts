import { httpClient } from "@/lib/http";
import type {
  ILocationSettings, ILocationSettingsEffectifs, MethodePaiement,
} from "../types/location-settings.type";

export interface ModifierLocationSettingsDTO {
  taxRateOverride?: number | null;
  paymentMethodsOverride?: MethodePaiement[] | null;
  ticketFooterMessage?: string | null;
  autoPrintDefault?: boolean;
  preferredPrinterSignature?: string | null;
  notes?: string | null;
}

const base = (locationId: string) => `/emplacements/${locationId}/settings`;

export const locationSettingsAPI = {
  obtenir: (token: string, locationId: string) =>
    httpClient.get<ILocationSettings>(base(locationId), { token }),

  obtenirEffectif: (token: string, locationId: string) =>
    httpClient.get<ILocationSettingsEffectifs>(`${base(locationId)}/effectifs`, { token }),

  modifier: (token: string, locationId: string, data: ModifierLocationSettingsDTO) =>
    httpClient.patch<ILocationSettings>(base(locationId), data, { token }),
};
