"use client";

import { useState, useCallback } from "react";
import type { IVariante, IProduit } from "@/features/catalogue/types/produit.type";
import { UniteMesure, uniteAccepteDecimal } from "@/features/unite/types/unite.type";
import { arrondirAuPas } from "@/features/unite/utils/unite";

export interface SupplementChoisi {
  supplementId: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
}

export interface ArticlePanier {
  varianteId: string;
  nomProduit: string;
  nomVariante: string;
  sku: string;
  image: string | null;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
  uniteVente: UniteMesure;
  pasMin: number | null;
  prixParUnite: boolean;
  supplements: SupplementChoisi[];
}

/**
 * Pas effectif a appliquer a +/-/incrementation initiale.
 * - Si pasMin defini, on l'utilise (ex: 0.1 kg).
 * - Sinon, 1 pour les unites UNITAIRE et 0.1 pour les unites continues.
 */
function pasEffectif(unite: UniteMesure, pasMin: number | null): number {
  if (pasMin && pasMin > 0) return pasMin;
  return uniteAccepteDecimal(unite) ? 0.1 : 1;
}

/** Recalcule le total ligne selon le mode tarifaire (forfait vs au kg/m).
 *  Inclut les supplements (prix * qte) qui s'appliquent une seule fois par ligne. */
function recalculerTotalLigne(article: Omit<ArticlePanier, "totalLigne">): number {
  const baseLigne = article.prixUnitaire * article.quantite;
  const totalSupplements = (article.supplements ?? []).reduce(
    (s, sup) => s + sup.prixUnitaire * sup.quantite,
    0,
  );
  return Number((baseLigne + totalSupplements).toFixed(2));
}

export function usePanier() {
  const [articles, setArticles] = useState<ArticlePanier[]>([]);

  const ajouter = useCallback(
    (
      produit: IProduit,
      variante: IVariante,
      quantiteInitiale?: number,
      supplements?: SupplementChoisi[],
    ) => {
      const unite = variante.uniteVente ?? UniteMesure.PIECE;
      const pas = pasEffectif(unite, variante.pasMin);
      const qInit = quantiteInitiale ?? pas;

      // Si la variante a des supplements distincts, on cree une nouvelle ligne
      // (deux clients qui prennent le meme menu avec des sauces differentes
      //  doivent rester sur deux lignes). Sinon on incremente la ligne existante.
      const cleSupplements = JSON.stringify(
        (supplements ?? []).map((s) => `${s.supplementId}:${s.quantite}`).sort(),
      );

      setArticles((prev) => {
        const existant = prev.find(
          (a) => a.varianteId === variante.id
            && JSON.stringify(a.supplements.map((s) => `${s.supplementId}:${s.quantite}`).sort()) === cleSupplements,
        );
        if (existant) {
          const q = arrondirAuPas(existant.quantite + (quantiteInitiale ?? pas), variante.pasMin);
          return prev.map((a) =>
            a === existant
              ? { ...a, quantite: q, totalLigne: recalculerTotalLigne({ ...a, quantite: q }) }
              : a,
          );
        }
        const nouveau: Omit<ArticlePanier, "totalLigne"> = {
          varianteId: variante.id,
          nomProduit: produit.nom,
          nomVariante: variante.nom || variante.sku,
          sku: variante.sku,
          image: produit.images?.[0] ?? null,
          quantite: arrondirAuPas(qInit, variante.pasMin),
          prixUnitaire: variante.prixDetail,
          uniteVente: unite,
          pasMin: variante.pasMin,
          prixParUnite: variante.prixParUnite,
          supplements: supplements ?? [],
        };
        return [...prev, { ...nouveau, totalLigne: recalculerTotalLigne(nouveau) }];
      });
    },
    [],
  );

  const modifierQuantite = useCallback((varianteId: string, deltaSigned: number) => {
    setArticles((prev) =>
      prev
        .map((a) => {
          if (a.varianteId !== varianteId) return a;
          const pas = pasEffectif(a.uniteVente, a.pasMin);
          // deltaSigned vaut +1/-1 dans l'UI : on le multiplie par le pas effectif.
          const delta = Math.sign(deltaSigned) * pas;
          const q = arrondirAuPas(Math.max(0, a.quantite + delta), a.pasMin);
          return { ...a, quantite: q, totalLigne: recalculerTotalLigne({ ...a, quantite: q }) };
        })
        .filter((a) => a.quantite > 0),
    );
  }, []);

  const definirQuantite = useCallback((varianteId: string, quantite: number) => {
    setArticles((prev) =>
      prev
        .map((a) => {
          if (a.varianteId !== varianteId) return a;
          const q = arrondirAuPas(Math.max(0, quantite), a.pasMin);
          return { ...a, quantite: q, totalLigne: recalculerTotalLigne({ ...a, quantite: q }) };
        })
        .filter((a) => a.quantite > 0),
    );
  }, []);

  /** Met a jour les supplements d'une ligne (cible par index pour eviter
   *  les conflits entre deux lignes ayant le meme varianteId). */
  const definirSupplementsLigne = useCallback(
    (indexLigne: number, supplements: SupplementChoisi[]) => {
      setArticles((prev) =>
        prev.map((a, i) => {
          if (i !== indexLigne) return a;
          return { ...a, supplements, totalLigne: recalculerTotalLigne({ ...a, supplements }) };
        }),
      );
    },
    [],
  );

  const retirer = useCallback((varianteId: string) => {
    setArticles((prev) => prev.filter((a) => a.varianteId !== varianteId));
  }, []);

  const vider = useCallback(() => setArticles([]), []);

  const chargerDepuisTicket = useCallback((
    lignes: Array<{
      varianteId: string;
      nomProduit: string;
      nomVariante: string | null;
      sku: string;
      quantite: number;
      prixUnitaire: number;
      totalLigne: number;
      uniteVente?: UniteMesure;
      pasMin?: number | null;
      prixParUnite?: boolean;
    }>,
    images: Map<string, string | null>,
  ) => {
    setArticles(
      lignes.map((l: any) => ({
        varianteId: l.varianteId,
        nomProduit: l.nomProduit,
        nomVariante: l.nomVariante ?? l.sku,
        sku: l.sku,
        image: images.get(l.varianteId) ?? null,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        totalLigne: l.totalLigne,
        uniteVente: l.uniteVente ?? UniteMesure.PIECE,
        pasMin: l.pasMin ?? null,
        prixParUnite: l.prixParUnite ?? false,
        supplements: l.supplements ?? [],
      })),
    );
  }, []);

  const total = articles.reduce((s, a) => s + a.totalLigne, 0);
  const nombreArticles = articles.reduce((s, a) => s + a.quantite, 0);

  return {
    articles, total, nombreArticles,
    ajouter, modifierQuantite, definirQuantite, definirSupplementsLigne,
    retirer, vider, chargerDepuisTicket,
  };
}
