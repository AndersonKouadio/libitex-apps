"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { catalogueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Disponibilites des variantes pour un emplacement : map des variantes
 * en rupture + nb portions servables pour les MENU. Refetch frequent
 * pour refleter les ventes en cours d'autres caissiers.
 */
export function useDisponibilitesQuery(emplacementId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: catalogueKeyQuery("disponibilites", emplacementId),
    queryFn: () => catalogueAPI.disponibilites(token!, emplacementId!),
    enabled: !!token && !!emplacementId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
