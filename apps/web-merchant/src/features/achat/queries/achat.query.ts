"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { achatAPI } from "../apis/achat.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type {
  CommandeDTO,
  FournisseurDTO,
  ReceptionDTO,
  FraisDTO,
} from "../schemas/achat.schema";

export const achatKey = (...parts: unknown[]) => ["achat", ...parts];

// ─── Fournisseurs ──────────────────────────────────────────────────────

/**
 * Liste les fournisseurs du tenant.
 *
 * Fix I3 : `actifsSeulement` filtre cote front les fournisseurs avec
 * `actif=false`. Utile pour le select de creation de commande (on ne
 * doit pas pouvoir creer une commande chez un fournisseur desactive),
 * mais la page /achats/fournisseurs montre les deux.
 */
export function useFournisseurListQuery(
  recherche?: string,
  options?: { actifsSeulement?: boolean },
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: achatKey("fournisseurs", recherche, options?.actifsSeulement ?? false),
    queryFn: async () => {
      const tous = await achatAPI.listerFournisseurs(token!, recherche);
      if (options?.actifsSeulement) return tous.filter((f) => f.actif);
      return tous;
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useFournisseurQuery(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: achatKey("fournisseur", id),
    queryFn: () => achatAPI.obtenirFournisseur(token!, id),
    enabled: !!token && !!id,
  });
}

export function useCreerFournisseurMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FournisseurDTO) => achatAPI.creerFournisseur(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("fournisseurs") });
      toast.success("Fournisseur cree");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useModifierFournisseurMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FournisseurDTO> & { actif?: boolean } }) =>
      achatAPI.modifierFournisseur(token!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("fournisseurs") });
      qc.invalidateQueries({ queryKey: achatKey("fournisseur") });
      toast.success("Fournisseur modifie");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerFournisseurMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => achatAPI.supprimerFournisseur(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("fournisseurs") });
      toast.success("Fournisseur supprime");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

// ─── Commandes ─────────────────────────────────────────────────────────

export function useCommandeListQuery(filtres?: {
  statut?: string;
  fournisseurId?: string;
  emplacementId?: string;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: achatKey("commandes", filtres),
    queryFn: () => achatAPI.listerCommandes(token!, filtres),
    enabled: !!token,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCommandeQuery(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: achatKey("commande", id),
    queryFn: () => achatAPI.obtenirCommande(token!, id),
    enabled: !!token && !!id,
  });
}

export function useCreerCommandeMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CommandeDTO) => achatAPI.creerCommande(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("commandes") });
      toast.success("Commande creee");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useModifierStatutCommandeMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: "DRAFT" | "SENT" | "CANCELLED" }) =>
      achatAPI.modifierStatut(token!, id, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("commandes") });
      qc.invalidateQueries({ queryKey: achatKey("commande") });
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useReceptionMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceptionDTO }) =>
      achatAPI.recevoir(token!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("commandes") });
      qc.invalidateQueries({ queryKey: achatKey("commande") });
      qc.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Reception enregistree");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

// ─── Phase A.2 : Frais d'approche ──────────────────────────────────────

/**
 * Liste les frais d'approche d'une commande.
 * Invalide automatiquement quand on cree/modifie/supprime un frais.
 */
export function useFraisListQuery(commandeId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: achatKey("frais", commandeId),
    queryFn: () => achatAPI.listerFrais(token!, commandeId),
    enabled: !!token && !!commandeId,
    staleTime: 30_000,
  });
}

export function useAjouterFraisMutation(commandeId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FraisDTO) => achatAPI.ajouterFrais(token!, commandeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("frais", commandeId) });
      // La commande expose fraisTotal / totalDebarque, donc on rafraichit aussi.
      qc.invalidateQueries({ queryKey: achatKey("commande") });
      qc.invalidateQueries({ queryKey: achatKey("commandes") });
      toast.success("Frais ajoute");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useModifierFraisMutation(commandeId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fraisId, data }: { fraisId: string; data: Partial<FraisDTO> }) =>
      achatAPI.modifierFrais(token!, commandeId, fraisId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("frais", commandeId) });
      qc.invalidateQueries({ queryKey: achatKey("commande") });
      qc.invalidateQueries({ queryKey: achatKey("commandes") });
      toast.success("Frais modifie");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerFraisMutation(commandeId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fraisId: string) =>
      achatAPI.supprimerFrais(token!, commandeId, fraisId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achatKey("frais", commandeId) });
      qc.invalidateQueries({ queryKey: achatKey("commande") });
      qc.invalidateQueries({ queryKey: achatKey("commandes") });
      toast.success("Frais supprime");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
