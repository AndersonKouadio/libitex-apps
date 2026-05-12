"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { fideliteAPI } from "../apis/fidelite.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { IConfigFidelite } from "../types/fidelite.type";

export const fideliteKey = (...parts: unknown[]) => ["fidelite", ...parts];

export function useConfigFideliteQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: fideliteKey("config"),
    queryFn: () => fideliteAPI.obtenirConfig(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useModifierConfigFideliteMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IConfigFidelite>) => fideliteAPI.modifierConfig(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fideliteKey() });
      toast.success("Configuration enregistree");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSoldeFideliteQuery(customerId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: fideliteKey("solde", customerId),
    queryFn: () => fideliteAPI.solde(token!, customerId!),
    enabled: !!token && !!customerId,
    staleTime: 30_000,
  });
}

export function useHistoriqueFideliteQuery(customerId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: fideliteKey("historique", customerId),
    queryFn: () => fideliteAPI.historique(token!, customerId!),
    enabled: !!token && !!customerId,
    staleTime: 30_000,
  });
}

export function useAjusterPointsMutation(customerId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ points, note }: { points: number; note?: string }) =>
      fideliteAPI.ajuster(token!, customerId, points, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fideliteKey("solde", customerId) });
      qc.invalidateQueries({ queryKey: fideliteKey("historique", customerId) });
      toast.success("Points ajustes");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
