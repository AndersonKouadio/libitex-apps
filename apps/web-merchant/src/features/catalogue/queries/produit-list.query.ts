"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogueAPI } from "../apis/catalogue.api";
import { catalogueKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useProduitListQuery(page = 1, recherche?: string) {
  const { token } = useAuth();

  // Filtre isSupplement=false : la page Catalogue Produits ne montre QUE les
  // vrais produits, pas les supplements (qui ont leur propre onglet).
  return useQuery({
    queryKey: catalogueKeyQuery("produits", page, recherche),
    queryFn: () => catalogueAPI.listerProduits(token!, { page, recherche, isSupplement: false }),
    enabled: !!token,
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
