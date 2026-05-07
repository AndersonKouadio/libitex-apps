"use client";

import { useMutation } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CreerProduitDTO } from "../schemas/produit.schema";
import type { IProduit } from "../types/produit.type";

export function useAjouterProduitMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation<IProduit, Error, CreerProduitDTO>({
    mutationFn: (data) => catalogueAPI.creerProduit(token!, data),
    onSuccess: () => {
      invalidate();
    },
  });
}
