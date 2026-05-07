"use client";

import { useQuery } from "@tanstack/react-query";
import { stockAPI } from "../apis/stock.api";
import { stockKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useStockEmplacementQuery(emplacementId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: stockKeyQuery("emplacement", emplacementId),
    queryFn: () => stockAPI.stockParEmplacement(token!, emplacementId!),
    enabled: !!token && !!emplacementId,
    staleTime: 30_000,
  });
}
