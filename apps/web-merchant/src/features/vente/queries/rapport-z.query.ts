"use client";

import { useQuery } from "@tanstack/react-query";
import { venteAPI } from "../apis/vente.api";
import { venteKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useRapportZQuery(emplacementId: string | undefined, date: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: venteKeyQuery("rapport-z", emplacementId, date),
    queryFn: () => venteAPI.rapportZ(token!, emplacementId!, date),
    enabled: !!token && !!emplacementId,
  });
}
