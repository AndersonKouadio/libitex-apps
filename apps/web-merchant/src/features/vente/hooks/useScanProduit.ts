"use client";

import { useCallback, useRef } from "react";
import { toast } from "@heroui/react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import { catalogueAPI } from "@/features/catalogue/apis/catalogue.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface Options {
  /** Cache produits charges au POS, recherche front-side prioritaire (rapide + offline). */
  produits: IProduit[];
  /** Variantes indisponibles a l'emplacement courant (stock=0, supplement KO...). */
  indisponiblesVariantes?: Set<string>;
  /** Produits indisponibles (supplements en rupture, etc). */
  indisponiblesProduits?: Set<string>;
  /** Callback declenche au produit trouve. Le composant decide d'ajouter au panier. */
  onProduitTrouve: (produit: IProduit, variante: IVariante) => void;
}

/**
 * Hook scan POS. Strategie de resolution :
 * 1) Cherche dans le cache produits (douchette : ~0ms, offline-compatible)
 * 2) Sinon, appel API /catalogue/produits/par-code/:code
 *
 * Anti-rebond : un scan douchette peut envoyer plusieurs ENTER successifs
 * dans certaines configurations. On ignore les codes identiques recus a
 * moins de 300ms d'intervalle.
 */
export function useScanProduit({
  produits, indisponiblesVariantes, indisponiblesProduits, onProduitTrouve,
}: Options) {
  const { token } = useAuth();
  const dernierScan = useRef<{ code: string; ts: number } | null>(null);

  const scanner = useCallback(async (codeBrut: string) => {
    const code = codeBrut.trim();
    if (!code) return;

    const maintenant = Date.now();
    if (dernierScan.current
      && dernierScan.current.code === code
      && maintenant - dernierScan.current.ts < 300) {
      return;
    }
    dernierScan.current = { code, ts: maintenant };

    // 1) Recherche front-side dans le cache
    for (const p of produits) {
      const v = (p.variantes ?? []).find(
        (variante) => variante.codeBarres === code || variante.sku === code,
      );
      if (v) {
        if (indisponiblesVariantes?.has(v.id)) {
          toast.warning(`${p.nom} en rupture sur cet emplacement`);
          return;
        }
        if (indisponiblesProduits?.has(p.id)) {
          toast.warning(`${p.nom} indisponible`);
          return;
        }
        onProduitTrouve(p, v);
        return;
      }
    }

    // 2) Fallback API (utile si le cache POS est paginate ou si le produit
    // a ete ajoute depuis un autre poste sans qu'on ait encore refetch)
    if (!token) return;
    try {
      const p = await catalogueAPI.trouverProduitParCode(token, code);
      const v = (p.variantes ?? []).find(
        (variante) => variante.codeBarres === code || variante.sku === code,
      ) ?? p.variantes?.[0];
      if (!v) {
        toast.warning(`Code ${code} introuvable`);
        return;
      }
      onProduitTrouve(p, v);
    } catch {
      toast.warning(`Code ${code} introuvable`);
    }
  }, [produits, indisponiblesVariantes, indisponiblesProduits, onProduitTrouve, token]);

  return { scanner };
}
