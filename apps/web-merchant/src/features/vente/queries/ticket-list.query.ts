"use client";

import { useQuery } from "@tanstack/react-query";
import { venteAPI } from "../apis/vente.api";
import { venteKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useTicketListQuery(params?: { emplacementId?: string; statut?: string; page?: number }) {
  const { token } = useAuth();

  return useQuery({
    queryKey: venteKeyQuery("tickets", params),
    queryFn: () => venteAPI.listerTickets(token!, params),
    enabled: !!token,
  });
}

export function useTicketDetailQuery(id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: venteKeyQuery("ticket", id),
    queryFn: () => venteAPI.obtenirTicket(token!, id),
    enabled: !!token && !!id,
  });
}
