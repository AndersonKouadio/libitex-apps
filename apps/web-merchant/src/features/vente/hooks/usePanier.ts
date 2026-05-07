"use client";

import { useState, useCallback } from "react";
import type { IVariante, IProduit } from "@/features/catalogue/types/produit.type";

export interface ArticlePanier {
  varianteId: string;
  nomProduit: string;
  nomVariante: string;
  sku: string;
  image: string | null;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
}

export function usePanier() {
  const [articles, setArticles] = useState<ArticlePanier[]>([]);

  const ajouter = useCallback((produit: IProduit, variante: IVariante) => {
    setArticles((prev) => {
      const existant = prev.find((a) => a.varianteId === variante.id);
      if (existant) {
        return prev.map((a) =>
          a.varianteId === variante.id
            ? { ...a, quantite: a.quantite + 1, totalLigne: (a.quantite + 1) * a.prixUnitaire }
            : a,
        );
      }
      return [
        ...prev,
        {
          varianteId: variante.id,
          nomProduit: produit.nom,
          nomVariante: variante.nom || variante.sku,
          sku: variante.sku,
          image: produit.images?.[0] ?? null,
          quantite: 1,
          prixUnitaire: variante.prixDetail,
          totalLigne: variante.prixDetail,
        },
      ];
    });
  }, []);

  const modifierQuantite = useCallback((varianteId: string, delta: number) => {
    setArticles((prev) =>
      prev
        .map((a) =>
          a.varianteId === varianteId
            ? { ...a, quantite: a.quantite + delta, totalLigne: (a.quantite + delta) * a.prixUnitaire }
            : a,
        )
        .filter((a) => a.quantite > 0),
    );
  }, []);

  const retirer = useCallback((varianteId: string) => {
    setArticles((prev) => prev.filter((a) => a.varianteId !== varianteId));
  }, []);

  const vider = useCallback(() => setArticles([]), []);

  const total = articles.reduce((s, a) => s + a.totalLigne, 0);
  const nombreArticles = articles.reduce((s, a) => s + a.quantite, 0);

  return { articles, total, nombreArticles, ajouter, modifierQuantite, retirer, vider };
}
