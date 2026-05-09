"use client";

import { useMutation } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useImporterProduitsMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: (produits: unknown[]) => catalogueAPI.importerProduits(token!, produits),
    onSuccess: () => invalidate(),
  });
}
