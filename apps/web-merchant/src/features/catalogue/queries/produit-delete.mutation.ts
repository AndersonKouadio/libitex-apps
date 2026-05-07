"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useSupprimerProduitMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: (id: string) => catalogueAPI.supprimerProduit(token!, id),
    onSuccess: () => { invalidate(); toast.success("Produit supprime"); },
  });
}
