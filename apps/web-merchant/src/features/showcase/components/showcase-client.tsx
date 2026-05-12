"use client";

import { useState } from "react";
import { SearchField } from "@heroui/react";
import { Store } from "lucide-react";
import {
  useProduitsPublicsQuery, useCategoriesPubliquesQuery,
} from "../queries/showcase.query";
import { CarteProduitPublic } from "./carte-produit-public";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type {
  IBoutiquePublic, IPageProduitsPublics, ICategoriePublique,
} from "../types/showcase.type";

interface Props {
  boutique: IBoutiquePublic;
  /** Donnees prechargees cote serveur (SSR initial) pour eviter le flash. */
  produitsInitiaux: IPageProduitsPublics;
  categoriesInitiales: ICategoriePublique[];
}

const TAILLE_PAGE = 24;

/**
 * Partie interactive de la vitrine boutique. Le parent (Server Component)
 * a deja precharge la boutique + premiere page de produits + categories,
 * ce qui permet a Google d'indexer le contenu et au visiteur de voir les
 * produits immediatement (pas de spinner).
 *
 * Cette UI rajoute :
 * - Recherche (server-side, debounce 300ms)
 * - Filtre par categorie (pills)
 * - Pagination "Charger plus"
 */
export function ShowcaseClient({ boutique, produitsInitiaux, categoriesInitiales }: Props) {
  const slug = boutique.slug;
  const [categorieId, setCategorieId] = useState<string>("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const rechercheDebounced = useDebouncedValue(recherche, 300);

  // Categories : on a deja les donnees initiales, on les hydrate dans React Query
  const { data: categories = categoriesInitiales } = useCategoriesPubliquesQuery(slug);

  // Produits : avec filtres actifs, on requete a nouveau. Si pas de filtre +
  // page 0, on utilise les donnees prechargees (placeholderData).
  const aDesFiltres = categorieId !== "" || (rechercheDebounced.length >= 2) || page > 0;
  const { data: produitsPagine } = useProduitsPublicsQuery(slug, {
    categorieId: categorieId || undefined,
    recherche: rechercheDebounced.length >= 2 ? rechercheDebounced : undefined,
    limit: TAILLE_PAGE,
    offset: page * TAILLE_PAGE,
  });

  const produits = aDesFiltres ? produitsPagine : produitsInitiaux;
  const visibles = produits?.data ?? [];
  const total = produits?.total ?? 0;
  const aPlusDePages = visibles.length + page * TAILLE_PAGE < total;

  function changerCategorie(id: string) {
    setCategorieId(id);
    setPage(0);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchField
            value={recherche}
            onChange={(v) => { setRecherche(v); setPage(0); }}
            aria-label="Rechercher un produit"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Rechercher un produit" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      </div>

      {(categories?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changerCategorie("")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              !categorieId
                ? "bg-accent text-accent-foreground"
                : "bg-surface text-foreground border border-border hover:border-accent/40"
            }`}
          >
            Tout
          </button>
          {(categories ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => changerCategorie(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                categorieId === c.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-foreground border border-border hover:border-accent/40"
              }`}
            >
              {c.nom}
            </button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="text-center py-16">
          <Store size={32} className="mx-auto mb-3 text-muted opacity-30" />
          <p className="text-sm text-muted">
            {rechercheDebounced.length >= 2 ? "Aucun resultat" : "Aucun produit pour le moment"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibles.map((p) => (
              <CarteProduitPublic
                key={p.id}
                slug={boutique.slug}
                produit={p}
                devise={boutique.devise}
              />
            ))}
          </div>

          {aPlusDePages && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2 text-sm font-semibold rounded-lg bg-accent text-accent-foreground hover:brightness-95 transition-colors"
              >
                Charger plus
              </button>
              <p className="text-xs text-muted mt-2 tabular-nums">
                {visibles.length} sur {total}
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
