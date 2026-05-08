"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { supplementAPI } from "../apis/supplement.api";
import { supplementKeyQuery, useInvalidateSupplementQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CreerSupplementDTO, ModifierSupplementDTO } from "../schemas/supplement.schema";

export function useSupplementListQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: supplementKeyQuery("list"),
    queryFn: () => supplementAPI.lister(token!),
    enabled: !!token,
  });
}

export function useCreerSupplementMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateSupplementQuery();
  return useMutation({
    mutationFn: (data: CreerSupplementDTO) => supplementAPI.creer(token!, data),
    onSuccess: () => { invalidate(); toast.success("Supplément ajouté"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useModifierSupplementMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateSupplementQuery();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ModifierSupplementDTO }) =>
      supplementAPI.modifier(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Supplément mis à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerSupplementMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateSupplementQuery();
  return useMutation({
    mutationFn: (id: string) => supplementAPI.supprimer(token!, id),
    onSuccess: () => { invalidate(); toast.success("Supplément supprimé"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
