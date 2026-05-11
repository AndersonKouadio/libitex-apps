"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { stockAPI } from "../apis/stock.api";
import { stockKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { FiltreMouvements } from "../types/stock.type";

export function useMouvementsStockQuery(filtres: FiltreMouvements) {
  const { token } = useAuth();
  return useQuery({
    queryKey: stockKeyQuery("mouvements", filtres),
    queryFn: () => stockAPI.listerMouvements(token!, filtres),
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
