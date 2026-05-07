"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { stockAPI } from "../apis/stock.api";
import { useInvalidateStockQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useAjouterEmplacementMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();

  return useMutation({
    mutationFn: (data: { nom: string; type?: string; adresse?: string }) =>
      stockAPI.creerEmplacement(token!, data),
    onSuccess: () => { invalidate(); toast.success("Emplacement cree"); },
  });
}
