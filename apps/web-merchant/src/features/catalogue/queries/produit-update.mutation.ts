"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useModifierProduitMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      catalogueAPI.modifierProduit(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Produit mis a jour"); },
  });
}

/**
 * Bascule rapide actif/inactif depuis la liste catalogue. Pas de toast
 * de succes (le visuel du Switch suffit), uniquement sur erreur — sinon
 * cliquer 5 produits d'affilee genere 5 toasts.
 */
export function useBasculerActifProduitMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      catalogueAPI.modifierProduit(token!, id, { actif }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.danger(err.message || "Erreur lors du changement de statut"),
  });
}
