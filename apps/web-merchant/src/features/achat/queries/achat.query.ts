"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { achatAPI } from "../apis/achat.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CommandeDTO, FournisseurDTO, ReceptionDTO } from "../schemas/achat.schema";

export const achatKey = (...parts: unknown[]) => ["achat", ...parts];

// ─── Fournisseurs ──────────────────────────────────────────────────────

export function useFournisseurListQuery(recherche?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: achatKey("fournisseurs", recherche),
    queryFn: () => achatAPI.listerFournisseurs(token!, recherche),
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
    staleTime: 15_000,
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
