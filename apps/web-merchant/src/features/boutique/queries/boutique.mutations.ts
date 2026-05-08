"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { boutiqueAPI, type ModifierBoutiqueDTO } from "../apis/boutique.api";
import { useInvalidateBoutiqueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useModifierBoutiqueMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateBoutiqueQuery();
  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: ModifierBoutiqueDTO }) =>
      boutiqueAPI.modifier(token!, tenantId, data),
    onSuccess: () => { invalidate(); toast.success("Boutique mise à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerBoutiqueMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => boutiqueAPI.supprimer(token!, tenantId),
    onSuccess: () => {
      // Invalide tout le cache pour forcer le rechargement complet (le tenant
      // courant peut etre celui qu'on vient de supprimer).
      queryClient.invalidateQueries();
      toast.success("Boutique supprimée");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
