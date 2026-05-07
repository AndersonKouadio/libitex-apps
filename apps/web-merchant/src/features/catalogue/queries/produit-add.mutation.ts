"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
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
    onSuccess: (data) => {
      invalidate();
      toast.success(`${data.nom} ajoute au catalogue`);
    },
    onError: (err) => {
      toast.danger(err.message || "Erreur lors de la creation");
    },
  });
}
