import { httpClient } from "@/lib/http";
import type { IFournisseur, ICommande, IFrais } from "../types/achat.type";
import type {
  CommandeDTO,
  FournisseurDTO,
  ReceptionDTO,
  FraisDTO,
} from "../schemas/achat.schema";

const BASE = "/achats";

export const achatAPI = {
  // ─── Fournisseurs ────────────────────────────────────────────────────

  listerFournisseurs: (token: string, recherche?: string) => {
    const qs = recherche ? `?recherche=${encodeURIComponent(recherche)}` : "";
    return httpClient.get<IFournisseur[]>(`${BASE}/fournisseurs${qs}`, { token });
  },

  obtenirFournisseur: (token: string, id: string) =>
    httpClient.get<IFournisseur>(`${BASE}/fournisseurs/${id}`, { token }),

  creerFournisseur: (token: string, data: FournisseurDTO) =>
    httpClient.post<IFournisseur>(`${BASE}/fournisseurs`, data, { token }),

  importerFournisseurs: (token: string, fournisseurs: FournisseurDTO[]) =>
    httpClient.post<{ total: number; succes: number; erreurs: { ligne: number; message: string }[] }>(
      `${BASE}/fournisseurs/import`, { fournisseurs }, { token },
    ),

  modifierFournisseur: (token: string, id: string, data: Partial<FournisseurDTO> & { actif?: boolean }) =>
    httpClient.patch<IFournisseur>(`${BASE}/fournisseurs/${id}`, data, { token }),

  supprimerFournisseur: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/fournisseurs/${id}`, { token }),

  // ─── Commandes ───────────────────────────────────────────────────────

  listerCommandes: (token: string, filtres?: {
    statut?: string;
    fournisseurId?: string;
    emplacementId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (filtres?.statut) qs.set("statut", filtres.statut);
    if (filtres?.fournisseurId) qs.set("fournisseurId", filtres.fournisseurId);
    if (filtres?.emplacementId) qs.set("emplacementId", filtres.emplacementId);
    const qsStr = qs.toString();
    return httpClient.get<ICommande[]>(
      `${BASE}/commandes${qsStr ? `?${qsStr}` : ""}`,
      { token },
    );
  },

  obtenirCommande: (token: string, id: string) =>
    httpClient.get<ICommande>(`${BASE}/commandes/${id}`, { token }),

  creerCommande: (token: string, data: CommandeDTO) =>
    httpClient.post<ICommande>(`${BASE}/commandes`, data, { token }),

  modifierStatut: (
    token: string,
    id: string,
    statut: "DRAFT" | "SENT" | "CANCELLED",
  ) =>
    httpClient.patch<ICommande>(`${BASE}/commandes/${id}/statut`, { statut }, { token }),

  recevoir: (token: string, id: string, data: ReceptionDTO) =>
    httpClient.post<ICommande>(`${BASE}/commandes/${id}/recevoir`, data, { token }),

  // ─── Frais d'approche (Phase A.2) ───────────────────────────────────

  listerFrais: (token: string, commandeId: string) =>
    httpClient.get<IFrais[]>(`${BASE}/commandes/${commandeId}/frais`, { token }),

  ajouterFrais: (token: string, commandeId: string, data: FraisDTO) =>
    httpClient.post<IFrais>(`${BASE}/commandes/${commandeId}/frais`, data, { token }),

  modifierFrais: (
    token: string,
    commandeId: string,
    fraisId: string,
    data: Partial<FraisDTO>,
  ) =>
    httpClient.patch<IFrais>(
      `${BASE}/commandes/${commandeId}/frais/${fraisId}`,
      data,
      { token },
    ),

  supprimerFrais: (token: string, commandeId: string, fraisId: string) =>
    httpClient.delete<void>(
      `${BASE}/commandes/${commandeId}/frais/${fraisId}`,
      { token },
    ),
};
