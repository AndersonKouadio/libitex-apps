"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchField, Input } from "@heroui/react";
import { Search, Package } from "lucide-react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import type { IStockEmplacement } from "@/features/stock/types/stock.type";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { CarteArticle } from "./carte-article";

interface Props {
  produits: IProduit[];
  stocks: IStockEmplacement[] | undefined;
  onAjouter: (produit: IProduit, variante: IVariante) => void;
}

const TOUTES = "__TOUTES__";
const SUPPLEMENTS = "__SUPPLEMENTS__";
const AUTRES = "__AUTRES__";

export function GrilleProduits({ produits, stocks, onAjouter }: Props) {
  const [recherche, setRecherche] = useState("");
  const [categorieActive, setCategorieActive] = useState<string>(TOUTES);
  const { data: categories } = useCategorieListQuery();

  const stockMap = useMemo(() => {
    if (!stocks) return null;
    return new Map(stocks.map((s) => [s.varianteId, s.quantite]));
  }, [stocks]);

  // On ne montre que les categories qui contiennent au moins un produit dans le
  // catalogue actif : evite d'avoir des onglets vides sur les petites boutiques.
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 py-3 shrink-0 space-y-3">
        <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un article">
          <Input placeholder="Rechercher un article ou scanner un code-barres..." autoFocus />
        </SearchField>

        {(categoriesPresentes.length > 0 || aDesSupplements || aDesAutres) && (
          <div
            className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1"
            role="tablist"
            aria-label="Filtrer par catégorie"
          >
            <OngletCategorie
              actif={categorieActive === TOUTES}
              onPress={() => setCategorieActive(TOUTES)}
              libelle="Tous"
              total={produits.length}
            />
            {categoriesPresentes.map((c) => {
              const total = produits.filter((p) => !p.isSupplement && p.categorieId === c.id).length;
              return (
                <OngletCategorie
                  key={c.id}
                  actif={categorieActive === c.id}
                  onPress={() => setCategorieActive(c.id)}
                  libelle={c.nom}
                  total={total}
                />
              );
            })}
            {aDesSupplements && (
              <OngletCategorie
                actif={categorieActive === SUPPLEMENTS}
                onPress={() => setCategorieActive(SUPPLEMENTS)}
                libelle="Suppléments"
                total={produits.filter((p) => p.isSupplement).length}
              />
            )}
            {aDesAutres && (
              <OngletCategorie
                actif={categorieActive === AUTRES}
                onPress={() => setCategorieActive(AUTRES)}
                libelle="Autres"
                total={produits.filter((p) => !p.isSupplement && !p.categorieId).length}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtres.length === 0 && produits.length === 0 ? (
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
        ) : filtres.length === 0 ? (
          <div className="py-16 text-center">
            <Search size={28} strokeWidth={2} className="text-muted/30 mx-auto mb-2" />
            <p className="text-sm text-muted">Aucun article ne correspond a la recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5">
            {filtres.flatMap((produit) =>
              produit.variantes.map((variante) => (
                <CarteArticle
                  key={variante.id}
                  produit={produit}
                  variante={variante}
                  stock={stockMap?.get(variante.id) ?? null}
                  onAjouter={() => onAjouter(produit, variante)}
                />
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OngletCategorie({
  actif, onPress, libelle, total,
}: {
  actif: boolean;
  onPress: () => void;
  libelle: string;
  total: number;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      role="tab"
      aria-selected={actif}
      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
        actif
          ? "bg-accent text-accent-foreground shadow-sm"
          : "bg-surface text-muted border border-border hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {libelle}
      <span className={`text-[10px] tabular-nums ${actif ? "text-accent-foreground/70" : "text-muted/70"}`}>
        {total}
      </span>
    </button>
  );
}
