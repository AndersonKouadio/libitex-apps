"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { authAPI } from "../apis/auth.api";
import { useAuth } from "../hooks/useAuth";

export function useChangerMotDePasseMutation() {
  const { token, utilisateur, boutiques, boutiqueActive, appliquerSession } = useAuth();

  return useMutation({
    mutationFn: (data: { motDePasseActuel: string; nouveauMotDePasse: string }) =>
      authAPI.changerMotDePasse(token!, data),
    onSuccess: () => {
      // Mettre a jour la session pour lever le drapeau mustChangePassword
      if (token && utilisateur && boutiqueActive) {
        const refreshToken = typeof window !== "undefined"
          ? localStorage.getItem("libitex_refresh") ?? ""
          : "";
        appliquerSession(
          token,
          refreshToken,
          { ...utilisateur, mustChangePassword: false },
          boutiques,
          boutiqueActive,
        );
      }
      toast.success("Mot de passe modifié");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors du changement"),
  });
}
