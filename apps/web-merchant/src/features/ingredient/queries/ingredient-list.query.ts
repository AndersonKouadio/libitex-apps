"use client";

import { useQuery } from "@tanstack/react-query";
import { ingredientAPI } from "../apis/ingredient.api";
import { ingredientKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useIngredientListQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ingredientKeyQuery("list"),
    queryFn: () => ingredientAPI.lister(token!),
    enabled: !!token,
  });
}

export function useStockIngredientsQuery(emplacementId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ingredientKeyQuery("stock", emplacementId),
    queryFn: () => ingredientAPI.stockParEmplacement(token!, emplacementId!),
    enabled: !!token && !!emplacementId,
  });
}

export function useRecetteQuery(varianteId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ingredientKeyQuery("recette", varianteId),
    queryFn: () => ingredientAPI.obtenirRecette(token!, varianteId!),
    enabled: !!token && !!varianteId,
  });
}
