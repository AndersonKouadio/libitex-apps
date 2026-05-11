"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchField, Input } from "@heroui/react";
import {
  Search, Package, LayoutGrid, FolderOpen, UtensilsCrossed, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import type { IStockEmplacement } from "@/features/stock/types/stock.type";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { CarteArticle } from "./carte-article";

interface Props {
  produits: IProduit[];
  stocks: IStockEmplacement[] | undefined;
  disponibilites?: {
    indisponibles: string[];
    indisponiblesProduits: string[];
    portionsMenu: Record<string, number>;
  };
  onAjouter: (produit: IProduit, variante: IVariante) => void;
}

const TOUTES = "__TOUTES__";
const SUPPLEMENTS = "__SUPPLEMENTS__";
const AUTRES = "__AUTRES__";

interface OngletDef {
  id: string;
  libelle: string;
  total: number;
  icone: LucideIcon;
}

export function GrilleProduits({ produits, stocks, disponibilites, onAjouter }: Props) {
  const [recherche, setRecherche] = useState("");
  const [categorieActive, setCategorieActive] = useState<string>(TOUTES);
  const { data: categories } = useCategorieListQuery();

  const stockMap = useMemo(() => {
    if (!stocks) return null;
    return new Map(stocks.map((s) => [s.varianteId, s.quantite]));
  }, [stocks]);

  const setIndispo = useMemo(
    () => new Set(disponibilites?.indisponibles ?? []),
    [disponibilites],
  );
  const portionsMap = disponibilites?.portionsMenu ?? {};

  // Categories presentes dans le catalogue actif (au moins 1 produit non-supp).
  const categoriesPresentes = useMemo(() => {
    const ids = new Set(
      produits
        .filter((p) => !p.isSupplement)
        .map((p) => p.categorieId)
        .filter((id): id is string => Boolean(id)),
    );
    return (categories ?? []).filter((c) => ids.has(c.id));
  }, [categories, produits]);

  const aDesSupplements = useMemo(() => produits.some((p) => p.isSupplement), [produits]);
  const aDesAutres = useMemo(
    () => produits.some((p) => !p.isSupplement && !p.categorieId),
    [produits],
  );

  // Construction unifiee de la liste d'onglets.
  const onglets = useMemo<OngletDef[]>(() => {
    const liste: OngletDef[] = [
      { id: TOUTES, libelle: "Tous", total: produits.length, icone: LayoutGrid },
      ...categoriesPresentes.map((c) => ({
        id: c.id,
        libelle: c.nom,
        total: produits.filter((p) => !p.isSupplement && p.categorieId === c.id).length,
        icone: FolderOpen,
      })),
    ];
    if (aDesAutres) {
      liste.push({
        id: AUTRES,
        libelle: "Autres",
        total: produits.filter((p) => !p.isSupplement && !p.categorieId).length,
        icone: UtensilsCrossed,
      });
    }
    if (aDesSupplements) {
      liste.push({
        id: SUPPLEMENTS,
        libelle: "Suppléments",
        total: produits.filter((p) => p.isSupplement).length,
        icone: Sparkles,
      });
    }
    return liste;
  }, [produits, categoriesPresentes, aDesAutres, aDesSupplements]);

  const terme = recherche.toLowerCase().trim();
  const filtres = useMemo(() => {
    let liste = produits;
    if (categorieActive === SUPPLEMENTS) {
      liste = liste.filter((p) => p.isSupplement);
    } else if (categorieActive === AUTRES) {
      liste = liste.filter((p) => !p.isSupplement && !p.categorieId);
    } else if (categorieActive !== TOUTES) {
      liste = liste.filter((p) => p.categorieId === categorieActive);
    }
    if (terme) {
      liste = liste.filter(
        (p) =>
          p.nom.toLowerCase().includes(terme) ||
          p.variantes.some((v) => v.sku.toLowerCase().includes(terme)),
      );
    }
    return liste;
  }, [produits, terme, categorieActive]);

  // Mode "Tous" : on ordonne pour separer visuellement les types — produits par
  // categorie (ordre alpha), puis 'Autres' (sans categorie), puis supplements
  // tout en bas. Evite le melange brutal note par l'utilisateur.
  const filtresOrdonnes = useMemo(() => {
    if (categorieActive !== TOUTES) return filtres;
    const ordreCategorie = new Map(categoriesPresentes.map((c, i) => [c.id, i]));
    return [...filtres].sort((a, b) => {
      const aSupp = a.isSupplement ? 1 : 0;
      const bSupp = b.isSupplement ? 1 : 0;
      if (aSupp !== bSupp) return aSupp - bSupp; // supplements en dernier
      const aCat = a.categorieId ? (ordreCategorie.get(a.categorieId) ?? 999) : 1000;
      const bCat = b.categorieId ? (ordreCategorie.get(b.categorieId) ?? 999) : 1000;
      if (aCat !== bCat) return aCat - bCat;
      return a.nom.localeCompare(b.nom);
    });
  }, [filtres, categorieActive, categoriesPresentes]);

  const aucunArticle = produits.length === 0;
  const aucunResultat = !aucunArticle && filtres.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Barre de recherche : toujours en haut */}
      <div className="px-3 sm:px-4 pt-3 shrink-0">
        <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un article">
          <Input placeholder="Rechercher un article ou scanner un code-barres..." autoFocus />
        </SearchField>
      </div>

      {/* Mobile : onglets pills sous la recherche */}
      {onglets.length > 1 && (
        <div className="lg:hidden px-3 pt-2 pb-1 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1" role="tablist">
            {onglets.map((o) => (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={categorieActive === o.id}
                onClick={() => setCategorieActive(o.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  categorieActive === o.id
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-surface text-muted border border-border hover:text-foreground"
                }`}
              >
                {o.libelle}
                <span className={`text-[10px] tabular-nums ${
                  categorieActive === o.id ? "text-accent-foreground/70" : "text-muted/70"
                }`}>{o.total}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grille produits — flex-1, scrollable */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
        {aucunArticle ? (
          <div className="py-20 text-center">
            <Package size={36} strokeWidth={2} className="text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucun article disponible</p>
            <p className="text-sm text-muted mt-1">
              Ajoutez des produits dans le catalogue et recevez du stock pour commencer a vendre
            </p>
            <Link href="/catalogue" className="inline-block mt-3 text-sm font-medium text-accent hover:underline">
              Gerer le catalogue
            </Link>
          </div>
        ) : aucunResultat ? (
          <div className="py-16 text-center">
            <Search size={28} strokeWidth={2} className="text-muted/30 mx-auto mb-2" />
            <p className="text-sm text-muted">Aucun article ne correspond a la recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5">
            {filtresOrdonnes.flatMap((produit) =>
              produit.variantes.map((variante) => {
                // Pour les non-MENU : si listee comme indisponible, override stock a 0
                const stockBrut = stockMap?.get(variante.id) ?? null;
                const stockFinal = produit.typeProduit !== "MENU" && setIndispo.has(variante.id)
                  ? 0
                  : stockBrut;
                return (
                  <CarteArticle
                    key={variante.id}
                    produit={produit}
                    variante={variante}
                    stock={stockFinal}
                    portionsMenu={produit.typeProduit === "MENU" ? portionsMap[variante.id] : undefined}
                    onAjouter={() => onAjouter(produit, variante)}
                  />
                );
              }),
            )}
          </div>
        )}
      </div>

      {/* Desktop : cartes catégories en bas (sticky) — pratique sur tablette tactile */}
      {onglets.length > 1 && (
        <div className="hidden lg:block shrink-0 border-t border-border bg-surface px-3 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto" role="tablist">
            {onglets.map((o) => {
              const Icone = o.icone;
              const actif = categorieActive === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  onClick={() => setCategorieActive(o.id)}
                  className={`shrink-0 min-w-[90px] flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl border-2 transition-all ${
                    actif
                      ? "border-accent bg-accent/10 text-accent shadow-sm"
                      : "border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <Icone size={20} strokeWidth={actif ? 2.2 : 1.6} />
                  <span className="text-xs font-medium leading-tight text-center">{o.libelle}</span>
                  <span className={`text-[10px] tabular-nums leading-none ${
                    actif ? "text-accent/80" : "text-muted/70"
                  }`}>
                    {o.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
