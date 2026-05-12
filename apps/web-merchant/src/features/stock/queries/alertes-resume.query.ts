"use client";

import { useQuery } from "@tanstack/react-query";
import { stockAPI } from "../apis/stock.api";
import { stockKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Resume alertes stock global tous emplacements confondus. Utilise par le
 * badge sidebar pour signaler les variantes en alerte / rupture. Refetch
 * deja invalide automatiquement par les events realtime stock.updated.
 */
export function useAlertesResumeQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: stockKeyQuery("alertes-resume"),
    queryFn: () => stockAPI.resumeAlertes(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
