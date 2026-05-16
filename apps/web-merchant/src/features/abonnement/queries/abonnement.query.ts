"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { abonnementAPI } from "../apis/abonnement.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { SubscriptionPlan } from "../types/abonnement.type";

const KEY = ["abonnement"] as const;

export function useAbonnementQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...KEY, "etat"],
    queryFn: () => abonnementAPI.obtenir(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function usePlansQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...KEY, "plans"],
    queryFn: () => abonnementAPI.listerPlans(token!),
    enabled: !!token,
    staleTime: 5 * 60_000, // 5 min — plans changent rarement
  });
}

export function useChangerPlanMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: SubscriptionPlan) => abonnementAPI.changerPlan(token!, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Plan mis à jour");
    },
    onError: (e: Error) => toast.danger(e.message || "Erreur lors du changement de plan"),
  });
}
