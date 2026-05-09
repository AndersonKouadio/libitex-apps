"use client";

import { useQuery } from "@tanstack/react-query";
import { sessionCaisseAPI } from "../apis/session-caisse.api";
import { sessionCaisseKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useSessionActiveQuery(emplacementId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: sessionCaisseKeyQuery("active", emplacementId),
    queryFn: () => sessionCaisseAPI.active(token!, emplacementId!),
    enabled: !!token && !!emplacementId,
  });
}

export function useSessionDetailQuery(sessionId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: sessionCaisseKeyQuery("detail", sessionId),
    queryFn: () => sessionCaisseAPI.obtenir(token!, sessionId!),
    enabled: !!token && !!sessionId,
  });
}

export function useRecapitulatifFermetureQuery(sessionId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: sessionCaisseKeyQuery("recapitulatif", sessionId),
    queryFn: () => sessionCaisseAPI.recapitulatif(token!, sessionId!),
    enabled: !!token && !!sessionId,
  });
}
