"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useInvalidateCatalogueQuery } from "@/features/catalogue/queries/index.query";
import { catalogueAPI } from "@/features/catalogue/apis/catalogue.api";
import { TypeProduit, type IProduit } from "@/features/catalogue/types/produit.type";
import { Package, Plus, Search, Tag, Barcode, ChevronRight } from "lucide-react";

function formatPrix(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const LABELS_TYPE: Record<string, string> = {
  SIMPLE: "Standard",
  VARIANT: "Variantes",
  SERIALIZED: "Serialise",
  PERISHABLE: "Perissable",
};

const COULEURS_TYPE: Record<string, string> = {
  SIMPLE: "bg-blue-50 text-blue-700",
  VARIANT: "bg-violet-50 text-violet-700",
  SERIALIZED: "bg-amber-50 text-amber-700",
  PERISHABLE: "bg-emerald-50 text-emerald-700",
};

function LigneProduit({ produit }: { produit: IProduit }) {
  const variante = produit.variantes[0];
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        <Package size={18} className="text-neutral-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">{produit.nom}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {produit.marque && (
            <span className="text-xs text-neutral-400">{produit.marque}</span>
          )}
          <span className="text-xs font-mono text-neutral-400">{variante?.sku}</span>
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COULEURS_TYPE[produit.typeProduit] || ""}`}>
        {LABELS_TYPE[produit.typeProduit] || produit.typeProduit}
      </span>
      <div className="text-right w-28">
        <p className="text-sm font-semibold text-neutral-900 tabular-nums">
          {variante ? formatPrix(variante.prixDetail) : "--"} F
        </p>
        <p className="text-xs text-neutral-400">
          {produit.variantes.length} variante{produit.variantes.length > 1 ? "s" : ""}
        </p>
      </div>
      <ChevronRight size={16} className="text-neutral-300 shrink-0" />
    </div>
  );
}

export default function PageCatalogue() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");
  const { data, isLoading } = useProduitListQuery(page, recherche || undefined);
  const invalidate = useInvalidateCatalogueQuery();
  const [ajoutVisible, setAjoutVisible] = useState(false);

  const produits = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <Topbar titre="Catalogue" />
      <div className="p-6 max-w-6xl">
        {/* Barre d'actions */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white flex-1 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all">
              <Search size={16} className="text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={recherche}
                onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setAjoutVisible(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus size={16} />
            Nouveau produit
          </button>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* En-tete tableau */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-neutral-200 bg-neutral-50">
            <div className="w-10" />
            <span className="flex-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">Produit</span>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider w-24">Type</span>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider w-28 text-right">Prix detail</span>
            <div className="w-4" />
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-400">Chargement...</p>
            </div>
          ) : produits.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">Aucun produit dans le catalogue</p>
              <p className="text-xs text-neutral-400 mt-1">Commencez par ajouter votre premier article</p>
            </div>
          ) : (
            produits.map((p) => <LigneProduit key={p.id} produit={p} />)
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-neutral-400">
              {meta.total} produit{meta.total > 1 ? "s" : ""} au total
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                    p === page ? "bg-teal-600 text-white" : "text-neutral-500 hover:bg-neutral-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
