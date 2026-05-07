"use client";

import { useMutation } from "@tanstack/react-query";
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
    },
  });
}
