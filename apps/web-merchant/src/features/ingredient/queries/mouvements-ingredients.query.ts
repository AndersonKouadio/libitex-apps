"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ingredientAPI } from "../apis/ingredient.api";
import { ingredientKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { FiltreMouvementsIngredients } from "../types/ingredient.type";

export function useMouvementsIngredientsQuery(filtres: FiltreMouvementsIngredients) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ingredientKeyQuery("mouvements", filtres),
    queryFn: () => ingredientAPI.listerMouvements(token!, filtres),
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
