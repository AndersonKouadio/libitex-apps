"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { catalogueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useCategorieListQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: catalogueKeyQuery("categories"),
    queryFn: () => catalogueAPI.listerCategories(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}
