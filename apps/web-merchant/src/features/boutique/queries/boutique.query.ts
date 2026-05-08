"use client";

import { useQuery } from "@tanstack/react-query";
import { boutiqueAPI } from "../apis/boutique.api";
import { boutiqueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useBoutiqueQuery(tenantId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: boutiqueKeyQuery("detail", tenantId),
    queryFn: () => boutiqueAPI.obtenir(token!, tenantId!),
    enabled: !!token && !!tenantId,
    staleTime: 30_000,
  });
}
