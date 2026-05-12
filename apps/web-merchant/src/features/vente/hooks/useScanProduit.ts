"use client";

import { useCallback, useRef } from "react";
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
 * Fix I1 : warning non-bloquant si le checksum est mauvais. Permet de
 * detecter une douchette mal calibree (chiffre manque) sans bloquer les
 * SKU internes qui ne respectent pas EAN-13.
 *
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
 * Hook scan POS. Strategie de resolution :
 * 1) Cherche dans le cache produits (douchette : ~0ms, offline-compatible)
 * 2) Sinon, appel API /catalogue/produits/par-code/:code
 *
 * Anti-rebond : un scan douchette peut envoyer plusieurs ENTER successifs
 * dans certaines configurations. On ignore les codes identiques recus a
 * moins de 300ms d'intervalle.
 *
 * Fix C3 : distingue HttpError 404 (produit absent) vs erreur reseau
 * (offline, timeout). Un toast different + suggestion d'action.
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

    // Fix I1 : warning si le code ressemble a un EAN-13 mais le checksum est
    // KO. Non-bloquant : on tente quand meme la recherche, certaines
    // douchettes mal configurees envoient des chiffres en trop ou inverses.
    const ean = validerEan13(code);
    if (ean === false) {
      toast.warning(`Code ${code} : checksum EAN-13 invalide (douchette mal calibree ?)`);
    }

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
    // a ete ajoute depuis un autre poste sans qu'on ait encore refetch).
    //
    // Fix C3 : si on est offline, ne pas tenter l'API — afficher un toast
    // explicite. Si l'API renvoie un 404, c'est "produit absent". Si autre
    // erreur (timeout, 5xx, fetch failed), c'est un probleme reseau a
    // signaler differemment du "introuvable" pour ne pas perdre la vente.
    if (!token) return;
    if (!estEnLigne()) {
      toast.warning(`Code ${code} introuvable hors-ligne — re-essayez au retour reseau`);
      return;
    }
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
      // Reseau / timeout / 5xx : distinct du "introuvable" pour que le
      // caissier sache qu'il peut re-essayer sans changer le code.
      const msg = err instanceof Error ? err.message : "Erreur reseau";
      toast.danger(`Recherche echouee (${msg}) — re-essayez`);
    }
  }, [produits, indisponiblesVariantes, indisponiblesProduits, onProduitTrouve, token]);

  return { scanner };
}
