"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "@heroui/react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import { catalogueAPI } from "@/features/catalogue/apis/catalogue.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { HttpError } from "@/lib/http";
import { estEnLigne } from "@/lib/network-status";

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
 * Valide le checksum d'un code EAN-13 (13 chiffres). Algorithme officiel :
 * - Multiplier les 12 premiers chiffres alternativement par 1 et 3
 * - Somme + chiffre de controle (13e) doit etre multiple de 10
 *
 * Fix I1 : warning non-bloquant si le checksum est mauvais.
 * Retourne null si le code ne ressemble pas a un EAN-13 (longueur != 13
 * ou contient des lettres) — on ne valide alors pas.
 */
export function validerEan13(code: string): boolean | null {
  if (code.length !== 13 || !/^\d{13}$/.test(code)) return null;
  let somme = 0;
  for (let i = 0; i < 12; i += 1) {
    const chiffre = Number(code[i]);
    somme += i % 2 === 0 ? chiffre : chiffre * 3;
  }
  const checksum = (10 - (somme % 10)) % 10;
  return checksum === Number(code[12]);
}

/**
 * Construit un index `Map<code, {produit, variante}>` pour resoudre un
 * scan en O(1) au lieu de O(n*m) (n produits, m variantes chacun).
 *
 * Fix I7 : sur un catalogue de 5000 produits x 3 variantes = 15k
 * comparaisons par scan avec le find() en boucle precedent. Avec la Map,
 * le scan est instantane quel que soit la taille du catalogue.
 *
 * Les variantes peuvent avoir 2 cles distinctes (codeBarres + sku), on
 * indexe les deux. En cas de collision (peu probable), la derniere ecrite
 * gagne — comportement acceptable car le caissier voit le produit choisi
 * et peut corriger.
 *
 * Exporte pour permettre les tests unitaires.
 */
export function construireIndexScan(produits: IProduit[]): Map<string, { produit: IProduit; variante: IVariante }> {
  const map = new Map<string, { produit: IProduit; variante: IVariante }>();
  for (const p of produits) {
    for (const v of (p.variantes ?? [])) {
      if (v.codeBarres) map.set(v.codeBarres, { produit: p, variante: v });
      if (v.sku) map.set(v.sku, { produit: p, variante: v });
    }
  }
  return map;
}

/**
 * Hook scan POS. Strategie de resolution :
 * 1) Cherche dans l'index Map du cache produits (O(1), offline-compatible)
 * 2) Sinon, appel API /catalogue/produits/par-code/:code
 *
 * Anti-rebond : un scan douchette peut envoyer plusieurs ENTER successifs
 * dans certaines configurations. On ignore les codes identiques recus a
 * moins de 300ms d'intervalle.
 *
 * Expose :
 * - `scanner(code)` : declenche la recherche
 * - `scanEnCours` : vrai pendant l'appel API fallback (>0ms perceptible)
 */
export function useScanProduit({
  produits, indisponiblesVariantes, indisponiblesProduits, onProduitTrouve,
}: Options) {
  const { token } = useAuth();
  const dernierScan = useRef<{ code: string; ts: number } | null>(null);
  const [scanEnCours, setScanEnCours] = useState(false);

  // Fix I7 : index Map memoizee. Recalculee uniquement quand la liste
  // produits change (filtres POS, refetch). Construction O(n*m) une seule
  // fois, lookups en O(1).
  const indexScan = useMemo(() => construireIndexScan(produits), [produits]);

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

    // Fix I1 : warning si EAN-13 invalide. Non-bloquant.
    const ean = validerEan13(code);
    if (ean === false) {
      toast.warning(`Code ${code} : checksum EAN-13 invalide (douchette mal calibree ?)`);
    }

    // 1) Lookup O(1) dans l'index. Fix I7.
    const hit = indexScan.get(code);
    if (hit) {
      const { produit: p, variante: v } = hit;
      if (indisponiblesVariantes?.has(v.id)) {
        toast.warning(`${p.nom} en rupture sur cet emplacement — re-essayez apres reapprovisionnement`);
        return;
      }
      if (indisponiblesProduits?.has(p.id)) {
        toast.warning(`${p.nom} indisponible — un ou plusieurs ingredients sont epuises`);
        return;
      }
      onProduitTrouve(p, v);
      return;
    }

    // 2) Fallback API. Fix C3 : distingue offline, 404, erreur reseau.
    if (!token) return;
    if (!estEnLigne()) {
      toast.warning(`Code ${code} introuvable hors-ligne — re-essayez au retour reseau`);
      return;
    }

    setScanEnCours(true);
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
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        toast.warning(`Code ${code} introuvable`);
        return;
      }
      const msg = err instanceof Error ? err.message : "Erreur reseau";
      toast.danger(`Recherche echouee (${msg}) — re-essayez`);
    } finally {
      setScanEnCours(false);
    }
  }, [indexScan, indisponiblesVariantes, indisponiblesProduits, onProduitTrouve, token]);

  return { scanner, scanEnCours };
}
