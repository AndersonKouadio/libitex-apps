"use client";

import { useMutation } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useModifierProduitMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      catalogueAPI.modifierProduit(token!, id, data),
    onSuccess: () => { invalidate(); },
  });
}
