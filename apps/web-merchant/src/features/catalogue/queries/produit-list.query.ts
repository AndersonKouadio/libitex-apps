"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { catalogueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useProduitListQuery(
  page = 1,
  recherche?: string,
  options?: {
    isSupplement?: boolean | null;
    typeProduit?: string;
    categorieId?: string;
    actif?: boolean;
    /** Active un refetchInterval (utile sur POS pour voir les modifs cross-postes). */
    refetchAuto?: boolean;
  },
) {
  const { token } = useAuth();
  // Par defaut isSupplement=false : la page Catalogue Produits ne montre QUE
  // les vrais produits. Le POS passe `null` pour tout charger (incl. supplements).
  const filtreSupp = options?.isSupplement === null ? undefined : (options?.isSupplement ?? false);

  return useQuery({
    queryKey: catalogueKeyQuery(
      "produits", page, recherche, filtreSupp,
      options?.typeProduit, options?.categorieId, options?.actif,
    ),
    queryFn: () => catalogueAPI.listerProduits(token!, {
      page, recherche,
      isSupplement: filtreSupp,
      typeProduit: options?.typeProduit,
      categorieId: options?.categorieId,
      actif: options?.actif,
    }),
    enabled: !!token,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: options?.refetchAuto ? 30_000 : false,
  });
}

export function useProduitDetailQuery(id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: catalogueKeyQuery("produit", id),
    queryFn: () => catalogueAPI.obtenirProduit(token!, id),
    enabled: !!token && !!id,
  });
}

export function useCategorieListQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: catalogueKeyQuery("catégories"),
    queryFn: () => catalogueAPI.listerCategories(token!),
    enabled: !!token,
  });
}
