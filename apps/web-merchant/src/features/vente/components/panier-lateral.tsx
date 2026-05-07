"use client";

import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import type { ArticlePanier } from "../hooks/usePanier";

interface Props {
  articles: ArticlePanier[];
  total: number;
  onModifierQuantite: (varianteId: string, delta: number) => void;
  onRetirer: (varianteId: string) => void;
  onVider: () => void;
  onEncaisser: () => void;
  onAttente: () => void;
}

function formatPrix(montant: number) {
  return new Intl.NumberFormat("fr-FR").format(montant);
}

export function PanierLateral({
  articles, total, onModifierQuantite, onRetirer, onVider, onEncaisser, onAttente,
}: Props) {
  return (
    <div className="w-[360px] flex flex-col bg-white border-l border-neutral-200 shrink-0">
      {/* En-tete */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-800">
          Panier
          {articles.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-neutral-400">
              {articles.length} article{articles.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
        {articles.length > 0 && (
          <button onClick={onVider} className="text-xs text-red-500 hover:text-red-600 font-medium">
            Vider
          </button>
        )}
      </div>

      {/* Lignes */}
      <div className="flex-1 overflow-y-auto">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <ShoppingCart size={36} className="text-neutral-200 mb-3" />
            <p className="text-sm text-neutral-400">Panier vide</p>
            <p className="text-xs text-neutral-300 mt-1">Selectionnez un article pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {articles.map((a) => (
              <div key={a.varianteId} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{a.nomProduit}</p>
                    <p className="text-xs text-neutral-500">{a.nomVariante}</p>
                  </div>
                  <button onClick={() => onRetirer(a.varianteId)} className="text-neutral-300 hover:text-red-400 p-0.5 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onModifierQuantite(a.varianteId, -1)}
                      className="w-7 h-7 rounded border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{a.quantite}</span>
                    <button
                      onClick={() => onModifierQuantite(a.varianteId, 1)}
                      className="w-7 h-7 rounded border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {formatPrix(a.totalLigne)} F
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pied — Total + Actions */}
      <div className="border-t border-neutral-200 p-4 space-y-3">
        <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-[#1B1F3B]">
          <span className="text-sm text-white/60">TOTAL</span>
          <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {formatPrix(total)}
            <span className="text-sm font-normal text-white/50 ml-1">F</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEncaisser}
            disabled={articles.length === 0}
            className="flex-1 py-3 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 active:bg-teal-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Encaisser
          </button>
          <button
            onClick={onAttente}
            disabled={articles.length === 0}
            className="px-4 py-3 rounded-lg border border-amber-400 text-amber-600 text-sm font-medium hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mettre en attente"
          >
            Attente
          </button>
        </div>
      </div>
    </div>
  );
}
