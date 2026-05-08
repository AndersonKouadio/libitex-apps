"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { ingredientAPI } from "../apis/ingredient.api";
import { useInvalidateIngredientQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type {
  CreerIngredientDTO, EntreeIngredientDTO, AjustementIngredientDTO,
} from "../schemas/ingredient.schema";

export function useAjouterIngredientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();
  return useMutation({
    mutationFn: (data: CreerIngredientDTO) => ingredientAPI.creer(token!, data),
    onSuccess: (data) => { invalidate(); toast.success(`${data.nom} ajouté`); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la création"),
  });
}

export function useReceptionnerIngredientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();
  return useMutation({
    mutationFn: (data: EntreeIngredientDTO) => ingredientAPI.receptionner(token!, data),
    onSuccess: () => { invalidate(); toast.success("Stock réceptionné"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la réception"),
  });
}

export function useAjusterIngredientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();
  return useMutation({
    mutationFn: (data: AjustementIngredientDTO) => ingredientAPI.ajuster(token!, data),
    onSuccess: () => { invalidate(); toast.success("Stock ajusté"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de l'ajustement"),
  });
}

export function useModifierIngredientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreerIngredientDTO> }) =>
      ingredientAPI.modifier(token!, id, data),
    onSuccess: () => { invalidate(); toast.success("Ingrédient mis à jour"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur"),
  });
}

export function useSupprimerIngredientMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateIngredientQuery();
  return useMutation({
    mutationFn: (id: string) => ingredientAPI.supprimer(token!, id),
    onSuccess: () => { invalidate(); toast.success("Ingrédient supprimé"); },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de la suppression"),
  });
}
