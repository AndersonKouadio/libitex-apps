"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useModifierCategorieMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nom?: string; parentId?: string } }) =>
      catalogueAPI.modifierCategorie(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Catégorie mise à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerCategorieMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();
  return useMutation({
    mutationFn: (id: string) => catalogueAPI.supprimerCategorie(token!, id),
    onSuccess: () => { invalidate(); toast.success("Catégorie supprimée"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}
