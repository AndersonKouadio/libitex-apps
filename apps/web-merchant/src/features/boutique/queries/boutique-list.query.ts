"use client";

import { useQuery } from "@tanstack/react-query";
import { boutiqueAPI } from "../apis/boutique.api";
import { boutiqueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useBoutiqueListQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: boutiqueKeyQuery("list"),
    queryFn: () => boutiqueAPI.lister(token!),
    enabled: !!token,
  });
}
