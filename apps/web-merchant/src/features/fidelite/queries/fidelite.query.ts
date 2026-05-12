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

/**
 * Lit le solde points d'un client.
 *
 * Fix I10 : `staleTime: 0` + `refetchOnWindowFocus: true` quand la query
 * est utilisee dans un contexte de paiement critique (sinon le solde
 * affiche peut etre stale si un autre poste a debite entre temps).
 * Pour les contextes non-critiques (fiche client), `staleTime: 30s` reste
 * acceptable via le parametre `fresh`.
 */
export function useSoldeFideliteQuery(
  customerId: string | undefined,
  options?: { fresh?: boolean },
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: fideliteKey("solde", customerId),
    queryFn: () => fideliteAPI.solde(token!, customerId!),
    enabled: !!token && !!customerId,
    staleTime: options?.fresh ? 0 : 30_000,
    refetchOnWindowFocus: options?.fresh ? true : false,
  });
}

/**
 * Historique des transactions fidelite. Pagine via limit/offset.
 * Fix I8 : le client peut charger plus de pages au-dela des 20 premieres.
 */
export function useHistoriqueFideliteQuery(
  customerId: string | undefined,
  opts?: { limit?: number; offset?: number },
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: fideliteKey("historique", customerId, opts?.limit ?? 20, opts?.offset ?? 0),
    queryFn: () => fideliteAPI.historique(token!, customerId!, opts),
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
