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
    // Profil boutique change tres rarement (param admin) — cache 5 min.
    // L'invalidate sur modifierBoutique force le refresh quand il faut.
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
