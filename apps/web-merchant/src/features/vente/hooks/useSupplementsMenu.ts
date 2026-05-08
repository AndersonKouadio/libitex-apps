"use client";

import { useState, useCallback } from "react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import type { SupplementChoisi } from "./usePanier";

interface PanierAdapter {
  ajouter: (produit: IProduit, variante: IVariante, quantiteInitiale?: number, supplements?: SupplementChoisi[]) => void;
}

interface SaisieEnCours {
  produit: IProduit;
  variante: IVariante;
}

/**
 * Hook qui gere l'orchestration de la modale "supplements" au POS.
 * - Si le produit a au moins un supplement rattache → ouvre la modale
 * - Sinon → ajout direct au panier (pass-through au callback)
 *
 * Ce hook est compose avec useSaisieQuantite (pour les unites au poids) :
 * pour les MENUs, ces deux flux sont mutuellement exclusifs (une recette
 * se vend a la piece).
 */
export function useSupplementsMenu(panier: PanierAdapter) {
  const [saisie, setSaisie] = useState<SaisieEnCours | null>(null);

  /**
   * Tente d'ajouter un produit au panier. Si le produit a des supplements
   * rattaches, on intercepte et on ouvre la modale. Renvoie true si la modale
   * a ete ouverte (intercepte), false sinon (le caller peut continuer son flux).
   */
  const tenterOuvrir = useCallback((produit: IProduit, variante: IVariante): boolean => {
    if (!produit.supplementIds || produit.supplementIds.length === 0) return false;
    setSaisie({ produit, variante });
    return true;
  }, []);

  const confirmer = useCallback((supplements: SupplementChoisi[]) => {
    if (!saisie) return;
    panier.ajouter(saisie.produit, saisie.variante, undefined, supplements);
    setSaisie(null);
  }, [saisie, panier]);

  const fermer = useCallback(() => setSaisie(null), []);

  return { saisie, tenterOuvrir, confirmer, fermer };
}
