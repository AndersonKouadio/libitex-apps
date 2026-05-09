"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ModifierVarianteDTO } from "../schemas/produit.schema";

export function useModifierVarianteMutation(produitId: string) {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: ({ varianteId, data }: { varianteId: string; data: ModifierVarianteDTO }) =>
      catalogueAPI.modifierVariante(token!, produitId, varianteId, data),
    onSuccess: () => { invalidate(); toast.success("Variante mise à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la modification"),
  });
}
