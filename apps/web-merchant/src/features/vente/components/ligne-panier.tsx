"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Minus, Plus, Trash2, Package, Pencil, Sparkles, Tag } from "lucide-react";
import type { ArticlePanier } from "../hooks/usePanier";
import { formatMontant } from "../utils/format";
import { formaterQuantite, UNITE_LABELS, uniteAccepteDecimal } from "@/features/unite/types/unite.type";

interface Props {
  article: ArticlePanier;
  onModifierQuantite: (varianteId: string, delta: number) => void;
  onDefinirQuantite: (varianteId: string, quantite: number) => void;
  onRetirer: (varianteId: string) => void;
  /** Optionnel : ouvre une saisie directe (utile pour produits pesés). */
  onSaisirQuantite?: (varianteId: string) => void;
  /** Optionnel : ouvre la modale supplements pour cette ligne. */
  onPersonnaliser?: () => void;
  /** Optionnel : ouvre la modale de remise pour cette ligne. */
  onAppliquerRemise?: () => void;
}

export function LignePanier({
  article,
  onModifierQuantite,
  onDefinirQuantite,
  onRetirer,
  onSaisirQuantite,
  onPersonnaliser,
  onAppliquerRemise,
}: Props) {
  const decimal = uniteAccepteDecimal(article.uniteVente);
  const [valeurInput, setValeurInput] = useState(String(article.quantite));

  // Resynchroniser si la quantite change ailleurs (delta via +/-)
  useEffect(() => {
    setValeurInput(String(article.quantite));
  }, [article.quantite]);

  function commit() {
    const n = Number(valeurInput);
    if (!Number.isFinite(n) || n < 1) {
      setValeurInput(String(article.quantite));
      return;
    }
    if (Math.floor(n) !== article.quantite) {
      onDefinirQuantite(article.varianteId, Math.floor(n));
    } else {
      setValeurInput(String(article.quantite));
    }
  }

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
            <Package size={20} strokeWidth={2} />
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
            {article.supplements.length > 0 ? (
              <ul className="mt-1 space-y-0.5 pl-2 border-l-2 border-warning/30">
                {article.supplements.map((s) => (
                  <li key={s.supplementId} className="text-[10px] text-muted">
                    + {s.nom}{s.quantite > 1 ? ` ×${s.quantite}` : ""}{" "}
                    <span className="tabular-nums">({formatMontant(s.prixUnitaire * s.quantite)} F)</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-muted/70 font-mono mt-0.5">{article.sku}</p>
            )}
          </div>
          <Button
            variant="ghost"
            className="text-muted hover:text-danger p-1 h-auto min-w-0 -mr-1"
            onPress={() => onRetirer(article.varianteId)}
            aria-label={`Retirer ${article.nomProduit}`}
          >
            <Trash2 size={16} strokeWidth={2} />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center bg-surface-secondary rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-7 h-7 min-w-0 p-0 text-muted hover:text-foreground hover:bg-foreground/5 rounded-none"
              onPress={() => onModifierQuantite(article.varianteId, -1)}
              isDisabled={article.quantite <= 1}
              aria-label="Diminuer"
            >
              <Minus size={16} strokeWidth={2} />
            </Button>
            {decimal && onSaisirQuantite ? (
              <Button
                variant="ghost"
                className="px-3 h-7 min-w-0 text-sm font-semibold tabular-nums hover:text-accent hover:bg-transparent gap-1.5 rounded-none"
                onPress={() => onSaisirQuantite(article.varianteId)}
                aria-label="Saisir une quantité"
              >
                {formaterQuantite(article.quantite, article.uniteVente)}
                <Pencil size={12} strokeWidth={2} className="text-muted/70" />
              </Button>
            ) : (
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={valeurInput}
                onChange={(e) => setValeurInput(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                  if (e.key === "Escape") setValeurInput(String(article.quantite));
                }}
                className="w-12 text-center text-sm font-semibold tabular-nums bg-transparent outline-none focus:bg-surface focus:ring-1 focus:ring-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Quantité de ${article.nomProduit}`}
              />
            )}
            <Button
              variant="ghost"
              className="w-7 h-7 min-w-0 p-0 text-muted hover:text-foreground hover:bg-foreground/5 rounded-none"
              onPress={() => onModifierQuantite(article.varianteId, 1)}
              aria-label="Augmenter"
            >
              <Plus size={16} strokeWidth={2} />
            </Button>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground tabular-nums leading-none">
              {formatMontant(article.totalLigne)}
              <span className="text-[10px] font-normal text-muted ml-0.5">F</span>
            </p>
            {article.remise ? (
              <p className="text-[10px] text-warning tabular-nums mt-0.5">
                -{formatMontant(article.remise.montant)} F
                {article.remise.type === "POURCENTAGE" && ` (${article.remise.valeurOriginale}%)`}
              </p>
            ) : (
              <p className="text-[10px] text-muted/70 tabular-nums mt-0.5">
                {formatMontant(article.prixUnitaire)} F
                {article.prixParUnite && <> / {UNITE_LABELS[article.uniteVente]}</>}
                {!article.prixParUnite && article.quantite > 1 && <> × {article.quantite}</>}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {onPersonnaliser && (
            <Button
              variant="ghost"
              className={`gap-1.5 text-xs font-medium px-2.5 py-1.5 h-auto min-w-0 rounded-md border transition-colors ${
                article.supplements.length > 0
                  ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
                  : "border-dashed border-accent/50 text-accent hover:bg-accent/10"
              }`}
              onPress={onPersonnaliser}
              aria-label="Ajouter des suppléments"
            >
              <Sparkles size={13} strokeWidth={2.2} />
              {article.supplements.length > 0
                ? `Suppléments (${article.supplements.length})`
                : "+ Supplément"}
            </Button>
          )}
          {onAppliquerRemise && (
            <Button
              variant="ghost"
              className={`gap-1.5 text-xs font-medium px-2.5 py-1.5 h-auto min-w-0 rounded-md border transition-colors ${
                article.remise
                  ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15"
                  : "border-dashed border-warning/50 text-warning hover:bg-warning/10"
              }`}
              onPress={onAppliquerRemise}
              aria-label="Appliquer une remise"
            >
              <Tag size={13} strokeWidth={2.2} />
              {article.remise ? "Remise" : "+ Remise"}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
