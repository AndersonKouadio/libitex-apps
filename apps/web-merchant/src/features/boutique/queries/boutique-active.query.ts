"use client";

import { useQuery } from "@tanstack/react-query";
import { boutiqueAPI } from "../apis/boutique.api";
import { boutiqueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useBoutiqueActiveQuery() {
  const { token, boutiqueActive } = useAuth();
  return useQuery({
    queryKey: boutiqueKeyQuery("active", boutiqueActive?.id),
    queryFn: () => boutiqueAPI.obtenirActive(token!),
    enabled: !!token && !!boutiqueActive,
    staleTime: 60_000,
  });
}
