"use client";

import { Button } from "@heroui/react";
import { Minus, Plus, Trash2, Package } from "lucide-react";
import type { ArticlePanier } from "../hooks/usePanier";
import { formatMontant } from "../utils/format";

interface Props {
  article: ArticlePanier;
  onModifierQuantite: (varianteId: string, delta: number) => void;
  onRetirer: (varianteId: string) => void;
}

export function LignePanier({ article, onModifierQuantite, onRetirer }: Props) {
  return (
    <li className="flex gap-3 p-3 group">
      <div className="w-12 h-12 rounded-lg bg-surface-secondary overflow-hidden shrink-0">
        {article.image ? (
          <img
            src={article.image}
            alt={article.nomProduit}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted/30">
            <Package size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate leading-tight">
              {article.nomProduit}
            </p>
            <p className="text-xs text-muted truncate mt-0.5">{article.nomVariante}</p>
            <p className="text-[10px] text-muted/70 font-mono mt-0.5">{article.sku}</p>
          </div>
          <Button
            variant="ghost"
            className="text-muted hover:text-danger p-1 h-auto min-w-0 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onPress={() => onRetirer(article.varianteId)}
            aria-label={`Retirer ${article.nomProduit}`}
          >
            <Trash2 size={14} />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center bg-surface-secondary rounded-lg">
            <Button
              variant="ghost"
              className="w-7 h-7 min-w-0 p-0 text-muted hover:text-foreground hover:bg-transparent"
              onPress={() => onModifierQuantite(article.varianteId, -1)}
              aria-label="Diminuer"
            >
              <Minus size={12} />
            </Button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">{article.quantite}</span>
            <Button
              variant="ghost"
              className="w-7 h-7 min-w-0 p-0 text-muted hover:text-foreground hover:bg-transparent"
              onPress={() => onModifierQuantite(article.varianteId, 1)}
              aria-label="Augmenter"
            >
              <Plus size={12} />
            </Button>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground tabular-nums leading-none">
              {formatMontant(article.totalLigne)}
              <span className="text-[10px] font-normal text-muted ml-0.5">F</span>
            </p>
            {article.quantite > 1 && (
              <p className="text-[10px] text-muted/70 tabular-nums mt-0.5">
                {formatMontant(article.prixUnitaire)} F × {article.quantite}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
