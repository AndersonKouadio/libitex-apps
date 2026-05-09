"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { stockAPI } from "../apis/stock.api";
import { useInvalidateStockQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AjustementStockDTO } from "../schemas/stock.schema";

export function useAjustementStockMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();

  return useMutation({
    mutationFn: (data: AjustementStockDTO) => stockAPI.ajusterStock(token!, data),
    onSuccess: () => {
      invalidate();
      toast.success("Inventaire ajusté");
    },
    onError: (err: Error) => {
      toast.danger(err.message || "Erreur lors de l'ajustement");
    },
  });
}
