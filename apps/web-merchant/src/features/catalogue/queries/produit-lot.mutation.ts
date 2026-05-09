"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { catalogueAPI } from "../apis/catalogue.api";
import { useInvalidateCatalogueQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ResultatLot { succes: number; erreurs: number; }

/**
 * Mutations en lot. Pas de route backend dediee : on parallelise des
 * requetes individuelles via Promise.allSettled — accepte les echecs
 * partiels et retourne un compte. C'est suffisant pour des selections
 * de quelques dizaines de produits ; au-dela, prevoir une route batch
 * cote API.
 */

export function useBasculerActifLotMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();
  return useMutation({
    mutationFn: async ({ ids, actif }: { ids: string[]; actif: boolean }): Promise<ResultatLot> => {
      const results = await Promise.allSettled(
        ids.map((id) => catalogueAPI.modifierProduit(token!, id, { actif })),
      );
      return {
        succes: results.filter((r) => r.status === "fulfilled").length,
        erreurs: results.filter((r) => r.status === "rejected").length,
      };
    },
    onSuccess: ({ succes, erreurs }, { actif }) => {
      invalidate();
      const verbe = actif ? "activé" : "désactivé";
      const verbes = actif ? "activés" : "désactivés";
      if (erreurs === 0) {
        toast.success(`${succes} produit${succes > 1 ? "s " + verbes : " " + verbe}`);
      } else {
        toast.warning(`${succes} ${verbes}, ${erreurs} en erreur`);
      }
    },
  });
}

export function useSupprimerLotMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<ResultatLot> => {
      const results = await Promise.allSettled(
        ids.map((id) => catalogueAPI.supprimerProduit(token!, id)),
      );
      return {
        succes: results.filter((r) => r.status === "fulfilled").length,
        erreurs: results.filter((r) => r.status === "rejected").length,
      };
    },
    onSuccess: ({ succes, erreurs }) => {
      invalidate();
      if (erreurs === 0) toast.success(`${succes} produit${succes > 1 ? "s supprimés" : " supprimé"}`);
      else toast.warning(`${succes} supprimés, ${erreurs} en erreur`);
    },
  });
}

export function useChangerCategorieLotMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateCatalogueQuery();
  return useMutation({
    mutationFn: async ({ ids, categorieId }: { ids: string[]; categorieId: string | null }): Promise<ResultatLot> => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          catalogueAPI.modifierProduit(token!, id, { categorieId: categorieId ?? undefined }),
        ),
      );
      return {
        succes: results.filter((r) => r.status === "fulfilled").length,
        erreurs: results.filter((r) => r.status === "rejected").length,
      };
    },
    onSuccess: ({ succes, erreurs }) => {
      invalidate();
      if (erreurs === 0) toast.success(`${succes} produit${succes > 1 ? "s déplacés" : " déplacé"}`);
      else toast.warning(`${succes} déplacés, ${erreurs} en erreur`);
    },
  });
}
