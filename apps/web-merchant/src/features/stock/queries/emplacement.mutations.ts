"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { stockAPI } from "../apis/stock.api";
import { useInvalidateStockQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useModifierEmplacementMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nom?: string; type?: string; adresse?: string } }) =>
      stockAPI.modifierEmplacement(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Emplacement mis à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerEmplacementMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();
  return useMutation({
    mutationFn: (id: string) => stockAPI.supprimerEmplacement(token!, id),
    onSuccess: () => { invalidate(); toast.success("Emplacement supprimé"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
