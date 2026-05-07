"use client";

import { useMutation } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useAjouterCategorieMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: (data: { nom: string; parentId?: string }) =>
      catalogueAPI.creerCategorie(token!, data),
    onSuccess: () => { invalidate(); },
  });
}
