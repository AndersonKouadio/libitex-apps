"use client";

import { Button } from "@heroui/react";
import { ShoppingCart, PauseCircle, Receipt, Tag, X } from "lucide-react";
import type { ArticlePanier, Remise } from "../hooks/usePanier";
import { formatMontant } from "../utils/format";
import { LignePanier } from "./ligne-panier";
import { BoutonPOS } from "./bouton-pos";

interface Props {
  articles: ArticlePanier[];
  /** Sous-total avant remise globale (somme des totaux ligne, qui incluent deja les remises lignes). */
  sousTotal: number;
  /** Total final apres remise globale. */
  total: number;
  nombreArticles: number;
  /** Remise globale appliquee au ticket (ou null si aucune). */
  remiseGlobale: Remise | null;
  onModifierQuantite: (varianteId: string, delta: number) => void;
  onDefinirQuantite: (varianteId: string, quantite: number) => void;
  onRetirer: (varianteId: string) => void;
  onVider: () => void;
  onEncaisser: () => void;
  onAttente: () => void;
  /** Mode d'affichage. "lateral" = desktop fixe, "plein" = drawer mobile */
  mode?: "lateral" | "plein";
  /** Optionnel : ouvre la modale de saisie pour les unites continues (kg, m). */
  onSaisirQuantite?: (varianteId: string) => void;
  /** Optionnel : ouvre la modale supplements pour la ligne d'index donne. */
  onPersonnaliser?: (indexLigne: number) => void;
  /** Optionnel : ouvre la modale de remise sur une ligne. */
  onAppliquerRemiseLigne?: (indexLigne: number) => void;
  /** Optionnel : ouvre la modale de remise globale (ticket). */
  onAppliquerRemiseGlobale?: () => void;
  /** Optionnel : retire la remise globale sans ouvrir la modale. */
  onRetirerRemiseGlobale?: () => void;
}

export function PanierVente({
  articles, sousTotal, total, nombreArticles, remiseGlobale,
  onModifierQuantite, onDefinirQuantite, onRetirer, onVider, onEncaisser, onAttente,
  onSaisirQuantite, onPersonnaliser, onAppliquerRemiseLigne,
  onAppliquerRemiseGlobale, onRetirerRemiseGlobale, mode = "lateral",
}: Props) {
  const vide = articles.length === 0;

  const wrapperCls = mode === "lateral"
    ? "w-[380px] flex flex-col bg-surface border-l border-border shrink-0"
    : "w-full h-full flex flex-col bg-surface";

  return (
    <div className={wrapperCls}>
      <header className="px-4 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Receipt size={14} strokeWidth={2} />
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
          <div className="flex flex-col items-center justify-center h-full px-6 text-center min-h-[240px]">
            <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center mb-3">
              <ShoppingCart size={28} strokeWidth={2} className="text-muted/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Panier vide</p>
            <p className="text-xs text-muted mt-1 max-w-[240px]">
              Cliquez sur un article ou scannez un code-barres
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {articles.map((a, i) => (
              <LignePanier
                key={`${a.varianteId}-${i}`}
                article={a}
                onModifierQuantite={onModifierQuantite}
                onDefinirQuantite={onDefinirQuantite}
                onRetirer={onRetirer}
                onSaisirQuantite={onSaisirQuantite}
                onPersonnaliser={onPersonnaliser ? () => onPersonnaliser(i) : undefined}
                onAppliquerRemise={onAppliquerRemiseLigne ? () => onAppliquerRemiseLigne(i) : undefined}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border p-4 space-y-3 bg-surface safe-bottom">
        {/* Bouton remise globale + ligne remise dans le recap */}
        {!vide && onAppliquerRemiseGlobale && (
          <Button
            variant="ghost"
            className={`w-full gap-1.5 text-xs font-medium px-2.5 py-1.5 h-auto min-w-0 rounded-md border transition-colors ${
              remiseGlobale
                ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15"
                : "border-dashed border-warning/50 text-warning hover:bg-warning/10"
            }`}
            onPress={onAppliquerRemiseGlobale}
          >
            <Tag size={13} strokeWidth={2.2} />
            {remiseGlobale
              ? `Remise ticket : -${formatMontant(remiseGlobale.montant)} F${
                  remiseGlobale.type === "POURCENTAGE" ? ` (${remiseGlobale.valeurOriginale}%)` : ""
                }`
              : "+ Remise sur le ticket"}
          </Button>
        )}

        <div className="px-4 py-3.5 rounded-xl bg-navy space-y-1">
          {!vide && remiseGlobale && (
            <>
              <div className="flex justify-between text-xs text-navy-foreground/55">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatMontant(sousTotal)} F</span>
              </div>
              <div className="flex justify-between text-xs text-warning">
                <span className="flex items-center gap-1">
                  Remise
                  {remiseGlobale.raison && (
                    <span className="text-navy-foreground/40 truncate max-w-[120px]">
                      · {remiseGlobale.raison}
                    </span>
                  )}
                  {onRetirerRemiseGlobale && (
                    <button
                      type="button"
                      onClick={onRetirerRemiseGlobale}
                      className="ml-1 p-0.5 hover:bg-warning/20 rounded"
                      aria-label="Retirer la remise"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
                <span className="tabular-nums">- {formatMontant(remiseGlobale.montant)} F</span>
              </div>
            </>
          )}
          <div className="flex items-end justify-between gap-2">
            <span className="text-xs text-navy-foreground/60 uppercase tracking-wider">Total</span>
            <span className="text-5xl font-bold text-navy-foreground tabular-nums tracking-tight leading-none">
              {formatMontant(total)}
              <span className="text-base font-normal text-navy-foreground/50 ml-1.5">F</span>
            </span>
          </div>
          {!vide && (
            <p className="text-[10px] text-navy-foreground/55 mt-1">
              {nombreArticles} article{nombreArticles > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <BoutonPOS
            variant="primary"
            className="flex-1"
            onPress={onEncaisser}
            isDisabled={vide}
          >
            Encaisser
          </BoutonPOS>
          <BoutonPOS
            variant="outline"
            className="px-5 border-warning/40 text-warning hover:bg-warning/5"
            onPress={onAttente}
            isDisabled={vide}
            aria-label="Mettre en attente"
          >
            <PauseCircle size={18} strokeWidth={2} />
            <span className="hidden sm:inline">Attente</span>
          </BoutonPOS>
        </div>
      </footer>
    </div>
  );
}
