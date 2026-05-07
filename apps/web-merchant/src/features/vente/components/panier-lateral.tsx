"use client";

import { Button } from "@heroui/react";
import { Minus, Plus, Trash2, ShoppingCart, PauseCircle } from "lucide-react";
import type { ArticlePanier } from "../hooks/usePanier";
import { formatMontant } from "../utils/format";

interface Props {
  articles: ArticlePanier[];
  total: number;
  onModifierQuantite: (varianteId: string, delta: number) => void;
  onRetirer: (varianteId: string) => void;
  onVider: () => void;
  onEncaisser: () => void;
  onAttente: () => void;
}

export function PanierLateral({
  articles, total, onModifierQuantite, onRetirer, onVider, onEncaisser, onAttente,
}: Props) {
  const vide = articles.length === 0;

  return (
    <div className="w-[360px] flex flex-col bg-surface border-l border-border shrink-0">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Panier
          {!vide && (
            <span className="ml-1.5 text-xs font-normal text-muted">
              {articles.length} article{articles.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
        {!vide && (
          <Button variant="ghost" className="text-xs text-danger px-2 h-7" onPress={onVider}>
            Vider
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {vide ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <ShoppingCart size={36} className="text-muted/30 mb-3" />
            <p className="text-sm text-muted">Panier vide</p>
            <p className="text-xs text-muted/70 mt-1">Selectionnez un article pour commencer</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {articles.map((a) => (
              <li key={a.varianteId} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.nomProduit}</p>
                    {a.nomVariante && <p className="text-xs text-muted">{a.nomVariante}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    className="text-muted hover:text-danger p-1 h-auto min-w-0"
                    onPress={() => onRetirer(a.varianteId)}
                    aria-label={`Retirer ${a.nomProduit}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      className="w-7 h-7 min-w-0 p-0"
                      onPress={() => onModifierQuantite(a.varianteId, -1)}
                      aria-label="Diminuer la quantite"
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{a.quantite}</span>
                    <Button
                      variant="outline"
                      className="w-7 h-7 min-w-0 p-0"
                      onPress={() => onModifierQuantite(a.varianteId, 1)}
                      aria-label="Augmenter la quantite"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMontant(a.totalLigne)} F
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border p-4 space-y-3">
        <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-navy">
          <span className="text-sm text-navy-foreground/60">TOTAL</span>
          <span className="text-2xl font-bold text-navy-foreground tabular-nums tracking-tight">
            {formatMontant(total)}
            <span className="text-sm font-normal text-navy-foreground/50 ml-1">F</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onPress={onEncaisser}
            isDisabled={vide}
          >
            Encaisser
          </Button>
          <Button
            variant="outline"
            className="gap-1.5 border-warning text-warning"
            onPress={onAttente}
            isDisabled={vide}
            aria-label="Mettre en attente"
          >
            <PauseCircle size={16} />
            Attente
          </Button>
        </div>
      </footer>
    </div>
  );
}
