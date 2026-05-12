"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { boutiqueAPI } from "../apis/boutique.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export function useSwitcherBoutiqueMutation() {
  const { token, appliquerSession } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => boutiqueAPI.switcher(token!, tenantId),
    onSuccess: (res) => {
      appliquerSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        utilisateur: res.utilisateur,
        boutiques: res.boutiques,
        boutiqueActive: res.boutiqueActive,
      });
      queryClient.clear();
      // Le panier draft est lie au tenant courant — on le vide au switch
      // pour eviter d'afficher des articles de l'autre boutique. La
      // queue offline reste : ses entries ont leur tenantId verrouille
      // (filtre via useFileOfflineTenant) donc pas de leak.
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.POS_PANIER_DRAFT);
      }
      toast.success(`Boutique active : ${res.boutiqueActive.nom}`);
    },
    onError: (err) => {
      toast.danger(err.message || "Impossible de basculer");
    },
  });
}
