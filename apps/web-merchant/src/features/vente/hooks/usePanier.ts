"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { IVariante, IProduit } from "@/features/catalogue/types/produit.type";
import { UniteMesure, uniteAccepteDecimal } from "@/features/unite/types/unite.type";
import { arrondirAuPas } from "@/features/unite/utils/unite";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export interface SupplementChoisi {
  supplementId: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
}

/**
 * Remise appliquee a une ligne ou au ticket complet.
 * Le montant est toujours stocke en F CFA. type/valeurOriginale sont
 * conserves pour l'affichage (ex. "-10% (1 000 F)").
 */
export interface Remise {
  type: "POURCENTAGE" | "MONTANT";
  valeurOriginale: number;
  montant: number;
  raison?: string;
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
  remise: Remise | null;
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
 *  Inclut les supplements (prix * qte) qui s'appliquent une seule fois par ligne.
 *  La remise eventuelle est soustraite du sous-total ligne (sans descendre sous 0). */
function recalculerTotalLigne(article: Omit<ArticlePanier, "totalLigne">): number {
  const baseLigne = article.prixUnitaire * article.quantite;
  const totalSupplements = (article.supplements ?? []).reduce(
    (s, sup) => s + sup.prixUnitaire * sup.quantite,
    0,
  );
  const sousTotal = baseLigne + totalSupplements;
  const remise = article.remise?.montant ?? 0;
  return Number(Math.max(0, sousTotal - remise).toFixed(2));
}

/** Calcule le montant d'une remise a partir du type+valeur, plafonne au sous-total. */
export function calculerMontantRemise(
  type: "POURCENTAGE" | "MONTANT",
  valeur: number,
  sousTotal: number,
): number {
  if (valeur <= 0 || sousTotal <= 0) return 0;
  if (type === "POURCENTAGE") {
    const pct = Math.min(100, valeur);
    return Number(((sousTotal * pct) / 100).toFixed(2));
  }
  return Math.min(sousTotal, Number(valeur.toFixed(2)));
}

export interface ClientPanier {
  /** Optionnel : id si client existant en base, absent si saisie libre. */
  id?: string;
  nom?: string;
  telephone?: string;
}

/**
 * Donnees du panier persistees en localStorage. Permet de ne PAS perdre
 * la vente en cours si :
 * - l'utilisateur ferme l'onglet par erreur
 * - le browser crash
 * - l'utilisateur tente "Mettre en attente" hors-ligne (la mise en attente
 *   serveur est bloquee offline mais le panier reste dispo au reload)
 *
 * Fix I3 du Module 2.
 */
interface PanierPersiste {
  articles: ArticlePanier[];
  remiseGlobale: Remise | null;
  note: string;
  client: ClientPanier | null;
}

function lirePanierPersiste(): PanierPersiste | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POS_PANIER_DRAFT);
    if (!raw) return null;
    return JSON.parse(raw) as PanierPersiste;
  } catch {
    return null;
  }
}

function ecrirePanierPersiste(p: PanierPersiste): void {
  if (typeof window === "undefined") return;
  // Si tout vide, on retire la cle pour ne pas polluer.
  if (p.articles.length === 0 && !p.remiseGlobale && !p.note && !p.client) {
    localStorage.removeItem(STORAGE_KEYS.POS_PANIER_DRAFT);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.POS_PANIER_DRAFT, JSON.stringify(p));
}

export function usePanier() {
  // Restaure depuis localStorage au mount (fix I3). lazy init pour eviter
  // le re-calcul a chaque render.
  const persistInitial = typeof window !== "undefined" ? lirePanierPersiste() : null;
  const [articles, setArticles] = useState<ArticlePanier[]>(
    () => persistInitial?.articles ?? [],
  );
  const [remiseGlobale, setRemiseGlobale] = useState<Remise | null>(
    () => persistInitial?.remiseGlobale ?? null,
  );
  const [note, setNote] = useState<string>(() => persistInitial?.note ?? "");
  const [client, setClient] = useState<ClientPanier | null>(
    () => persistInitial?.client ?? null,
  );

  // Persiste a chaque change. Le 1er render persiste a vide, donc skip
  // via une ref pour ne pas ecrire inutilement au mount.
  const skipFirstWrite = useRef(true);
  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    ecrirePanierPersiste({ articles, remiseGlobale, note, client });
  }, [articles, remiseGlobale, note, client]);

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
          remise: null,
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

  /**
   * Applique ou remplace la remise sur une ligne. Le montant est recalcule
   * a partir du sous-total ligne (prix*qte + supplements). Passer null retire
   * la remise.
   */
  const definirRemiseLigne = useCallback(
    (
      indexLigne: number,
      remise: { type: "POURCENTAGE" | "MONTANT"; valeur: number; raison?: string } | null,
    ) => {
      setArticles((prev) =>
        prev.map((a, i) => {
          if (i !== indexLigne) return a;
          if (!remise) {
            return { ...a, remise: null, totalLigne: recalculerTotalLigne({ ...a, remise: null }) };
          }
          const sousTotal = a.prixUnitaire * a.quantite
            + (a.supplements ?? []).reduce((s, sup) => s + sup.prixUnitaire * sup.quantite, 0);
          const montant = calculerMontantRemise(remise.type, remise.valeur, sousTotal);
          const r: Remise = {
            type: remise.type, valeurOriginale: remise.valeur, montant, raison: remise.raison,
          };
          return { ...a, remise: r, totalLigne: recalculerTotalLigne({ ...a, remise: r }) };
        }),
      );
    },
    [],
  );

  /**
   * Applique ou remplace la remise globale sur le ticket. Le montant est
   * calcule sur le sous-total apres remises lignes. Passer null retire.
   */
  const definirRemiseGlobale = useCallback(
    (remise: { type: "POURCENTAGE" | "MONTANT"; valeur: number; raison?: string } | null) => {
      if (!remise) { setRemiseGlobale(null); return; }
      // setArticles n'est pas appele : on calcule a partir de l'etat courant
      // via une lecture immediate. Comme remiseGlobale ne depend pas des autres
      // setters et qu'on n'a pas besoin d'etre transactionnel, c'est OK.
      setArticles((articlesCourants) => {
        const sousTotal = articlesCourants.reduce((s, a) => s + a.totalLigne, 0);
        const montant = calculerMontantRemise(remise.type, remise.valeur, sousTotal);
        setRemiseGlobale({
          type: remise.type, valeurOriginale: remise.valeur, montant, raison: remise.raison,
        });
        return articlesCourants;
      });
    },
    [],
  );

  const vider = useCallback(() => {
    setArticles([]);
    setRemiseGlobale(null);
    setNote("");
    setClient(null);
  }, []);

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
        remise: null,
      })),
    );
  }, []);

  const sousTotal = articles.reduce((s, a) => s + a.totalLigne, 0);
  // Si la remise globale est en pourcentage, la valeur cachee est figee au moment
  // de l'application. On la recalcule ici pour suivre les modifications du panier
  // (ajout/retrait d'article, changement de quantite).
  const montantRemiseGlobale = remiseGlobale
    ? calculerMontantRemise(remiseGlobale.type, remiseGlobale.valeurOriginale, sousTotal)
    : 0;
  const total = Math.max(0, sousTotal - montantRemiseGlobale);
  const nombreArticles = articles.reduce((s, a) => s + a.quantite, 0);

  return {
    articles, sousTotal, total, nombreArticles, note, client,
    remiseGlobale: remiseGlobale ? { ...remiseGlobale, montant: montantRemiseGlobale } : null,
    ajouter, modifierQuantite, definirQuantite, definirSupplementsLigne,
    definirRemiseLigne, definirRemiseGlobale,
    definirNote: setNote, definirClient: setClient,
    retirer, vider, chargerDepuisTicket,
  };
}
