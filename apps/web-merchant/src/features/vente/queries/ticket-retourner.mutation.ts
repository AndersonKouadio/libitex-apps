"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { venteAPI } from "../apis/vente.api";
import { useInvalidateVenteQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { IRetourTicketPayload } from "../types/vente.type";

export function useRetournerTicketMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateVenteQuery();

  return useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: IRetourTicketPayload }) =>
      venteAPI.retournerTicket(token!, ticketId, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Retour enregistré — stock remis à jour");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? err?.message ?? "Erreur lors du retour";
      toast.danger(msg);
    },
  });
}
