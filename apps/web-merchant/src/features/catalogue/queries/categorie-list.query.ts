"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { catalogueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useCategorieListQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: catalogueKeyQuery("catégories"),
    queryFn: () => catalogueAPI.listerCategories(token!),
    enabled: !!token,
    // Reduit (5min -> 60s) pour que la creation/maj d'une categorie soit
    // visible sur les autres onglets/postes sous une minute sans WS.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
