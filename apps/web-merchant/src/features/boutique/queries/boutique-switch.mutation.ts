"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { boutiqueAPI } from "../apis/boutique.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

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
      toast.success(`Boutique active : ${res.boutiqueActive.nom}`);
    },
    onError: (err) => {
      toast.danger(err.message || "Impossible de basculer");
    },
  });
}
