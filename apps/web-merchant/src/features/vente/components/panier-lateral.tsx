"use client";

import { Button } from "@heroui/react";
import { ShoppingCart, PauseCircle, Receipt } from "lucide-react";
import type { ArticlePanier } from "../hooks/usePanier";
import { formatMontant } from "../utils/format";
import { LignePanier } from "./ligne-panier";

interface Props {
  articles: ArticlePanier[];
  total: number;
  nombreArticles: number;
  onModifierQuantite: (varianteId: string, delta: number) => void;
  onRetirer: (varianteId: string) => void;
  onVider: () => void;
  onEncaisser: () => void;
  onAttente: () => void;
}

export function PanierLateral({
  articles, total, nombreArticles,
  onModifierQuantite, onRetirer, onVider, onEncaisser, onAttente,
}: Props) {
  const vide = articles.length === 0;

  return (
    <div className="w-[380px] flex flex-col bg-surface border-l border-border shrink-0">
      <header className="px-4 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Receipt size={14} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Panier</p>
            {!vide && (
              <p className="text-[10px] text-muted leading-none mt-0.5">
                {articles.length} ligne{articles.length > 1 ? "s" : ""} · {nombreArticles} article{nombreArticles > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {!vide && (
          <Button variant="ghost" className="text-xs text-danger px-2 h-7" onPress={onVider}>
            Vider
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {vide ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center mb-3">
              <ShoppingCart size={28} className="text-muted/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Panier vide</p>
            <p className="text-xs text-muted mt-1 max-w-[200px]">
              Cliquez sur un article ou scannez un code-barres
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {articles.map((a) => (
              <LignePanier
                key={a.varianteId}
                article={a}
                onModifierQuantite={onModifierQuantite}
                onRetirer={onRetirer}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border p-4 space-y-3 bg-surface">
        <div className="px-4 py-3.5 rounded-xl bg-navy">
          <div className="flex items-end justify-between gap-2">
            <span className="text-xs text-navy-foreground/60 uppercase tracking-wider">Total</span>
            <span className="text-2xl font-bold text-navy-foreground tabular-nums tracking-tight leading-none">
              {formatMontant(total)}
              <span className="text-sm font-normal text-navy-foreground/50 ml-1">F</span>
            </span>
          </div>
          {!vide && (
            <p className="text-[10px] text-navy-foreground/40 mt-1">
              {nombreArticles} article{nombreArticles > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1 h-11 font-semibold"
            onPress={onEncaisser}
            isDisabled={vide}
          >
            Encaisser
          </Button>
          <Button
            variant="outline"
            className="h-11 px-4 gap-1.5 border-warning/40 text-warning hover:bg-warning/5"
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
