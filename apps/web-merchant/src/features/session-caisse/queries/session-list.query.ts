"use client";

import { useQuery } from "@tanstack/react-query";
import { sessionCaisseAPI } from "../apis/session-caisse.api";
import { sessionCaisseKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useSessionListQuery(params?: {
  emplacementId?: string;
  caissierId?: string;
  statut?: "OPEN" | "CLOSED";
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: sessionCaisseKeyQuery("list", params),
    queryFn: () => sessionCaisseAPI.lister(token!, params),
    enabled: !!token,
  });
}
