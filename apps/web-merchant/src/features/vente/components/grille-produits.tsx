"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";

interface Props {
  produits: IProduit[];
  onAjouter: (produit: IProduit, variante: IVariante) => void;
}

function formatPrix(montant: number) {
  return new Intl.NumberFormat("fr-FR").format(montant);
}

export function GrilleProduits({ produits, onAjouter }: Props) {
  const [recherche, setRecherche] = useState("");

  const filtres = produits.filter(
    (p) =>
      p.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      p.variantes.some((v) => v.sku.toLowerCase().includes(recherche.toLowerCase())),
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Barre de recherche */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-200 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all">
          <Search size={18} className="text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un article ou scanner un code-barres..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-neutral-800 placeholder:text-neutral-400"
            autoFocus
          />
          {recherche && (
            <button onClick={() => setRecherche("")} className="text-xs text-neutral-400 hover:text-neutral-600">
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Grille */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {filtres.flatMap((produit) =>
            produit.variantes.map((variante) => (
              <button
                key={variante.id}
                onClick={() => onAjouter(produit, variante)}
                className="bg-white rounded-lg border border-neutral-200 p-3 text-left hover:border-teal-400 hover:shadow-sm active:scale-[0.98] transition-all"
              >
                <p className="text-sm font-medium text-neutral-800 truncate leading-tight">
                  {produit.nom}
                </p>
                {variante.nom && (
                  <p className="text-xs text-neutral-500 truncate mt-0.5">{variante.nom}</p>
                )}
                <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">{variante.sku}</p>
                <p className="text-base font-semibold text-neutral-900 mt-2 tabular-nums">
                  {formatPrix(variante.prixDetail)}
                  <span className="text-[11px] font-normal text-neutral-400 ml-1">F</span>
                </p>
              </button>
            )),
          )}

          {filtres.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <p className="text-sm text-neutral-400">Aucun article ne correspond a la recherche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
