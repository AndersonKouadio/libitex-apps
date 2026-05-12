"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { notificationAPI } from "../apis/notification.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const notificationKey = (...parts: unknown[]) => ["notification", ...parts];

export function useNotificationListQuery(opts: { limit?: number; offset?: number } = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: notificationKey("liste", opts),
    queryFn: () => notificationAPI.lister(token!, opts),
    enabled: !!token,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useStatutProvidersQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: notificationKey("status"),
    queryFn: () => notificationAPI.status(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useEnvoyerBdCMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: (commandeId: string) => notificationAPI.envoyerBdC(token!, commandeId),
    onSuccess: (res) => {
      if (res.envoye) {
        toast.success("Bon de commande envoye au fournisseur sur WhatsApp.");
      } else {
        toast.warning(res.raison ?? "Envoi WhatsApp echoue.");
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      toast.danger(message);
    },
  });
}
