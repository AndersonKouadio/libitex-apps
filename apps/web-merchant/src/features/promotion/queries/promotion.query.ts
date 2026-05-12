"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { promotionAPI, type CreerPromotionDTO, type ModifierPromotionDTO } from "../apis/promotion.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const promotionKey = (...parts: unknown[]) => ["promotion", ...parts];

export function usePromotionsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: promotionKey("list"),
    queryFn: () => promotionAPI.lister(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useCreerPromotionMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreerPromotionDTO) => promotionAPI.creer(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionKey() });
      toast.success("Code promo cree");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useModifierPromotionMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ModifierPromotionDTO }) =>
      promotionAPI.modifier(token!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionKey() });
      toast.success("Code promo modifie");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerPromotionMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promotionAPI.supprimer(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionKey() });
      toast.success("Code promo supprime");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
