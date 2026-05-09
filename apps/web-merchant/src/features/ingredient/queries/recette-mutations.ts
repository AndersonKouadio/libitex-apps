"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { ingredientAPI } from "../apis/ingredient.api";
import { useInvalidateIngredientQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { DefinirRecetteDTO } from "../schemas/ingredient.schema";

export function useDefinirRecetteMutation(varianteId: string) {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();

  return useMutation({
    mutationFn: (data: DefinirRecetteDTO) =>
      ingredientAPI.definirRecette(token!, varianteId, data),
    onSuccess: () => { invalidate(); toast.success("Recette enregistrée"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de l'enregistrement"),
  });
}
