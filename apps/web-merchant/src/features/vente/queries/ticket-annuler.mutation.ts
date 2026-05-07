"use client";

import { useMutation } from "@tanstack/react-query";
import { venteAPI } from "../apis/vente.api";
import { useInvalidateVenteQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useAnnulerTicketMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateVenteQuery();

  return useMutation({
    mutationFn: (ticketId: string) => venteAPI.annuler(token!, ticketId),
    onSuccess: () => { invalidate(); },
  });
}
