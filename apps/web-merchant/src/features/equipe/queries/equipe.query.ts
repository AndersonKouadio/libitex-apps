"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { equipeAPI } from "../apis/equipe.api";
import { equipeKeyQuery, useInvalidateEquipeQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { InviterMembreDTO, ModifierMembreDTO } from "../schemas/equipe.schema";

export function useEquipeListQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: equipeKeyQuery("list"),
    queryFn: () => equipeAPI.lister(token!),
    enabled: !!token,
  });
}

export function useInviterMembreMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateEquipeQuery();
  return useMutation({
    mutationFn: (data: InviterMembreDTO) => equipeAPI.inviter(token!, data),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de l'invitation"),
  });
}

export function useModifierMembreMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateEquipeQuery();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ModifierMembreDTO }) =>
      equipeAPI.modifier(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Membre mis à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la modification"),
  });
}

export function useRetirerMembreMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateEquipeQuery();
  return useMutation({
    mutationFn: (membershipId: string) => equipeAPI.retirer(token!, membershipId),
    onSuccess: () => { invalidate(); toast.success("Membre retiré de la boutique"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors du retrait"),
  });
}
