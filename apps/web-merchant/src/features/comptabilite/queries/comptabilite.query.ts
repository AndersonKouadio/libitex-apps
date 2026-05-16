"use client";

import { useQuery } from "@tanstack/react-query";
import { comptabiliteAPI } from "../apis/comptabilite.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

const KEY = ["comptabilite"] as const;

export function usePlanComptableQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...KEY, "plan"],
    queryFn: () => comptabiliteAPI.listerPlan(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

export function useJournalQuery(params: {
  page?: number;
  dateDebut?: string;
  dateFin?: string;
  referenceType?: string;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...KEY, "journal", params],
    queryFn: () => comptabiliteAPI.listerJournal(token!, { ...params, limit: 25 }),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useBalanceQuery(params: { dateDebut?: string; dateFin?: string } = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...KEY, "balance", params],
    queryFn: () => comptabiliteAPI.balance(token!, params),
    enabled: !!token,
    staleTime: 30_000,
  });
}
