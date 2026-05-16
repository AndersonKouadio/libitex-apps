"use client";

import { useQuery } from "@tanstack/react-query";
import { stockAPI } from "../apis/stock.api";
import { stockKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Liste detaillee des variantes en rupture ou alerte — pour le dropdown de
 * la cloche topbar. Polling toutes les 2 min + invalidation realtime stock.updated.
 */
export function useAlertesDetailQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: stockKeyQuery("alertes-detail"),
    queryFn: () => stockAPI.listerAlertes(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}
