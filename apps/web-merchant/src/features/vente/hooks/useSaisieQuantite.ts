"use client";

import { useState, useCallback } from "react";
import { uniteAccepteDecimal } from "@/features/unite/types/unite.type";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";

interface PanierAdapter {
  articles: Array<{ varianteId: string; quantite: number }>;
  ajouter: (produit: IProduit, variante: IVariante, quantiteInitiale?: number) => void;
  definirQuantite: (varianteId: string, quantite: number) => void;
}

interface SaisieEnCours {
  produit: IProduit;
  variante: IVariante;
  /** Defini si on edite une ligne existante, undefined si nouvel ajout. */
  quantiteCourante?: number;
}

/**
 * Hook qui gere l'orchestration de la modal "saisir quantite" au POS :
 * - Tap sur un article a unite continue -> ouvre la saisie
 * - Tap sur un article a unite UNITAIRE -> ajout direct
 * - Clic sur la quantite d'une ligne du panier -> edition
 * - Confirmation -> ajoute ou met a jour selon le cas
 */
export function useSaisieQuantite(panier: PanierAdapter, produits: IProduit[]) {
  const [saisie, setSaisie] = useState<SaisieEnCours | null>(null);

  const ajouterDepuisGrille = useCallback((produit: IProduit, variante: IVariante) => {
    if (uniteAccepteDecimal(variante.uniteVente)) {
      setSaisie({ produit, variante });
      return;
    }
    panier.ajouter(produit, variante);
  }, [panier]);

  const ouvrirPourLigne = useCallback((varianteId: string) => {
    const article = panier.articles.find((a) => a.varianteId === varianteId);
    if (!article) return;
    const produit = produits.find((p) => p.variantes.some((v) => v.id === varianteId));
    const variante = produit?.variantes.find((v) => v.id === varianteId);
    if (!produit || !variante) return;
    setSaisie({ produit, variante, quantiteCourante: article.quantite });
  }, [panier.articles, produits]);

  const confirmer = useCallback((quantite: number) => {
    if (!saisie) return;
    if (saisie.quantiteCourante !== undefined) {
      panier.definirQuantite(saisie.variante.id, quantite);
    } else {
      panier.ajouter(saisie.produit, saisie.variante, quantite);
    }
    setSaisie(null);
  }, [saisie, panier]);

  const fermer = useCallback(() => setSaisie(null), []);

  return { saisie, ajouterDepuisGrille, ouvrirPourLigne, confirmer, fermer };
}
