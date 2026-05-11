"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { ingredientAPI } from "../apis/ingredient.api";
import { useInvalidateIngredientQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useAppliquerInventaireIngredientsMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();
  return useMutation({
    mutationFn: (data: {
      emplacementId: string; justification: string;
      lignes: Array<{ ingredientId: string; quantiteReelle: number }>;
    }) => ingredientAPI.appliquerInventaire(token!, data),
    onSuccess: (res) => {
      invalidate();
      const a = res.ajustements;
      const i = res.inchanges;
      toast.success(
        a === 0
          ? `Inventaire validé — aucun écart sur ${i} ingrédient${i > 1 ? "s" : ""}`
          : `Inventaire validé — ${a} ajustement${a > 1 ? "s" : ""}, ${i} ingrédient${i > 1 ? "s" : ""} sans écart`,
      );
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de l'inventaire"),
  });
}
