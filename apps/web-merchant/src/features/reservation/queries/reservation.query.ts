"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import {
  reservationAPI, type CreerReservationDTO, type ModifierReservationDTO,
} from "../apis/reservation.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const reservationKey = (...parts: unknown[]) => ["reservation", ...parts];

export function useReservationsQuery(filtres?: {
  emplacementId?: string;
  statut?: string;
  dateDebut?: string;
  dateFin?: string;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: reservationKey("list", filtres),
    queryFn: () => reservationAPI.lister(token!, filtres),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useResumeJourQuery(date?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: reservationKey("resume-jour", date),
    queryFn: () => reservationAPI.resumeJour(token!, date),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useCreerReservationMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreerReservationDTO) => reservationAPI.creer(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKey() });
      toast.success("Reservation creee");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useModifierReservationMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ModifierReservationDTO }) =>
      reservationAPI.modifier(token!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKey() });
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerReservationMutation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationAPI.supprimer(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKey() });
      toast.success("Reservation supprimee");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
