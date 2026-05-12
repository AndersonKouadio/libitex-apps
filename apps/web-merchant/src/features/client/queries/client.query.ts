"use client";

import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { clientAPI } from "../apis/client.api";
import { clientKeyQuery, useInvalidateClientQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CreerClientDTO } from "../schemas/client.schema";

export function useClientListQuery(page = 1, recherche?: string, segment?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: clientKeyQuery("list", page, recherche ?? "", segment ?? ""),
    queryFn: () => clientAPI.lister(token!, { page, recherche, segment }),
    enabled: !!token,
    // Pagination/recherche : on garde l'ancien dataset pendant que le nouveau
    // charge -> pas de flicker, pas de retour a "Aucun client" entre 2 pages.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useClientDetailQuery(id: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: clientKeyQuery("detail", id),
    queryFn: () => clientAPI.obtenir(token!, id!),
    enabled: !!token && !!id,
    staleTime: 60_000,
  });
}

export function useKpisClientQuery(id: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: clientKeyQuery("kpis", id),
    queryFn: () => clientAPI.kpis(token!, id!),
    enabled: !!token && !!id,
    staleTime: 60_000,
  });
}

export function useHistoriqueClientQuery(id: string | undefined, page = 1, pageSize = 25) {
  const { token } = useAuth();
  return useQuery({
    queryKey: clientKeyQuery("historique", id, page, pageSize),
    queryFn: () => clientAPI.historique(token!, id!, page, pageSize),
    enabled: !!token && !!id,
  });
}

export function useCreerClientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateClientQuery();
  return useMutation({
    mutationFn: (data: CreerClientDTO) => clientAPI.creer(token!, data),
    onSuccess: () => { invalidate(); toast.success("Client ajouté"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la création"),
  });
}

export function useModifierClientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateClientQuery();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreerClientDTO> }) =>
      clientAPI.modifier(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Client mis à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la modification"),
  });
}

export function useSupprimerClientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateClientQuery();
  return useMutation({
    mutationFn: (id: string) => clientAPI.supprimer(token!, id),
    onSuccess: () => { invalidate(); toast.success("Client supprimé"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la suppression"),
  });
}
