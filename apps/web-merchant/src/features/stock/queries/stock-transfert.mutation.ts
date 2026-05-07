"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { stockAPI } from "../apis/stock.api";
import { useInvalidateStockQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { TransfertStockDTO } from "../schemas/stock.schema";

export function useTransfertStockMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();

  return useMutation({
    mutationFn: (data: TransfertStockDTO) => stockAPI.transferer(token!, data),
    onSuccess: () => {
      invalidate();
      toast.success("Transfert effectue");
    },
    onError: (err: Error) => {
      toast.danger(err.message || "Erreur lors du transfert");
    },
  });
}
