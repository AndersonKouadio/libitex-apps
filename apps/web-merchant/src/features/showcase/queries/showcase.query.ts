"use client";

import { useQuery } from "@tanstack/react-query";
import { showcaseAPI } from "../apis/showcase.api";

export const showcaseKey = (...parts: unknown[]) => ["showcase", ...parts];

export function useBoutiquePubliqueQuery(slug: string) {
  return useQuery({
    queryKey: showcaseKey("boutique", slug),
    queryFn: () => showcaseAPI.obtenirBoutique(slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useProduitsPublicsQuery(slug: string, categorieId?: string) {
  return useQuery({
    queryKey: showcaseKey("produits", slug, categorieId),
    queryFn: () => showcaseAPI.listerProduits(slug, categorieId),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useProduitPublicQuery(slug: string, id: string) {
  return useQuery({
    queryKey: showcaseKey("produit", slug, id),
    queryFn: () => showcaseAPI.obtenirProduit(slug, id),
    enabled: !!slug && !!id,
    staleTime: 60_000,
  });
}

export function useCategoriesPubliquesQuery(slug: string) {
  return useQuery({
    queryKey: showcaseKey("categories", slug),
    queryFn: () => showcaseAPI.listerCategories(slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
