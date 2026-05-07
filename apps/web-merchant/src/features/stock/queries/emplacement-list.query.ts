"use client";

import { useQuery } from "@tanstack/react-query";
import { stockAPI } from "../apis/stock.api";
import { stockKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useEmplacementListQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: stockKeyQuery("emplacements"),
    queryFn: () => stockAPI.listerEmplacements(token!),
    enabled: !!token,
  });
}
