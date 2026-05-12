"use client";

import { use, useState } from "react";
import { Spinner } from "@heroui/react";
import { Search, Store } from "lucide-react";
import {
  useBoutiquePubliqueQuery, useProduitsPublicsQuery, useCategoriesPubliquesQuery,
} from "@/features/showcase/queries/showcase.query";
import { HeaderBoutique } from "@/features/showcase/components/header-boutique";
import { CarteProduitPublic } from "@/features/showcase/components/carte-produit-public";

export default function PageBoutiquePublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: boutique, isLoading: chBoutique, error } = useBoutiquePubliqueQuery(slug);
  const { data: categories } = useCategoriesPubliquesQuery(slug);
  const [categorieId, setCategorieId] = useState<string>("");
  const { data: produits } = useProduitsPublicsQuery(slug, categorieId || undefined);
  const [recherche, setRecherche] = useState("");

  if (chBoutique) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !boutique) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <Store size={32} className="mx-auto mb-3 text-muted opacity-50" />
          <p className="text-sm text-foreground">Boutique introuvable</p>
          <p className="text-xs text-muted mt-1">Verifiez l&apos;URL ou contactez le commercant.</p>
        </div>
      </div>
    );
  }

  const filtres = produits ?? [];
  const visibles = recherche
    ? filtres.filter((p) => p.nom.toLowerCase().includes(recherche.toLowerCase())
        || (p.marque ?? "").toLowerCase().includes(recherche.toLowerCase()))
    : filtres;

  return (
    <>
      <HeaderBoutique boutique={boutique} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit"
              className="w-full h-10 pl-8 pr-3 text-sm rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>

        {(categories?.length ?? 0) > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategorieId("")}
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
                onClick={() => setCategorieId(c.id)}
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
              {recherche ? "Aucun resultat" : "Aucun produit pour le moment"}
            </p>
          </div>
        ) : (
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
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted">
        Propulse par <span className="font-semibold text-foreground">LIBITEX</span>
      </footer>
    </>
  );
}
