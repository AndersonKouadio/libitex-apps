"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import {
  locationSettingsAPI, type ModifierLocationSettingsDTO,
} from "../apis/location-settings.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const locationSettingsKey = (...parts: unknown[]) => ["location-settings", ...parts];

export function useLocationSettingsQuery(locationId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: locationSettingsKey("brut", locationId),
    queryFn: () => locationSettingsAPI.obtenir(token!, locationId!),
    enabled: !!token && !!locationId,
    staleTime: 30_000,
  });
}

export function useLocationSettingsEffectifsQuery(locationId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: locationSettingsKey("effectif", locationId),
    queryFn: () => locationSettingsAPI.obtenirEffectif(token!, locationId!),
    enabled: !!token && !!locationId,
    staleTime: 60_000,
  });
}

export function useModifierLocationSettingsMutation(locationId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ModifierLocationSettingsDTO) =>
      locationSettingsAPI.modifier(token!, locationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: locationSettingsKey() });
      toast.success("Reglages enregistres");
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
