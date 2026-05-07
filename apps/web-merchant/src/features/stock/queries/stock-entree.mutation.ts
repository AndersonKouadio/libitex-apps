"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { stockAPI } from "../apis/stock.api";
import { useInvalidateStockQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { EntreeStockDTO } from "../schemas/stock.schema";

export function useEntreeStockMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();

  return useMutation({
    mutationFn: (data: EntreeStockDTO) => stockAPI.entreeStock(token!, data),
    onSuccess: () => {
      invalidate();
      toast.success("Stock receptionne");
    },
    onError: (err: Error) => {
      toast.danger(err.message || "Erreur lors de la réception");
    },
  });
}
