"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { boutiqueAPI } from "../apis/boutique.api";
import { useInvalidateBoutiqueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CreerBoutiqueDTO } from "@/features/auth/schemas/auth.schema";
import type { IBoutiqueResume } from "../types/boutique.type";

export function useAjouterBoutiqueMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateBoutiqueQuery();

  return useMutation<IBoutiqueResume, Error, CreerBoutiqueDTO>({
    mutationFn: (data) => boutiqueAPI.creer(token!, data),
    onSuccess: (data) => {
      invalidate();
      toast.success(`${data.nom} créé`);
    },
    onError: (err) => {
      toast.danger(err.message || "Erreur lors de la création");
    },
  });
}
