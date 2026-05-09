"use client";

import { Button } from "@heroui/react";
import {
  ShoppingCart, PauseCircle, Receipt, Tag, X, User, StickyNote, Eye, Trash2,
} from "lucide-react";
import type { ArticlePanier, Remise, ClientPanier } from "../hooks/usePanier";
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
  /** Note libre du ticket (Table 3, A emporter, Sans piment, etc.). */
  note: string;
  /** Client associe (existant ou saisie libre). */
  client: ClientPanier | null;
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
  /** Optionnel : edit/effacer la note. */
  onModifierNote?: (note: string) => void;
  /** Optionnel : ouvre la modale de selection client. */
  onChoisirClient?: () => void;
  /** Optionnel : ouvre l'apercu du ticket. */
  onApercu?: () => void;
}

export function PanierVente({
  articles, sousTotal, total, nombreArticles, remiseGlobale, note, client,
  onModifierQuantite, onDefinirQuantite, onRetirer, onVider, onEncaisser, onAttente,
  onSaisirQuantite, onPersonnaliser, onAppliquerRemiseLigne,
  onAppliquerRemiseGlobale, onRetirerRemiseGlobale,
  onModifierNote, onChoisirClient, onApercu, mode = "lateral",
}: Props) {
  const vide = articles.length === 0;
  const aRemise = !!remiseGlobale && remiseGlobale.montant > 0;

  const wrapperCls = mode === "lateral"
    ? "w-[380px] flex flex-col bg-surface border-l border-border shrink-0"
    : "w-full h-full flex flex-col bg-surface";

  return (
    <div className={wrapperCls}>
      {/* Header compact : icone + titre + compteur + actions tete */}
      <header className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Receipt size={14} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none">Panier</p>
            {!vide && (
              <p className="text-[10px] text-muted leading-none mt-0.5">
                {articles.length} ligne{articles.length > 1 ? "s" : ""} · {nombreArticles} article{nombreArticles > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {!vide && (
          <Button
            variant="ghost"
            className="text-xs text-muted hover:text-danger px-2 h-7 gap-1"
            onPress={onVider}
            aria-label="Vider le panier"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Vider</span>
          </Button>
        )}
      </header>

      {/* Barre meta : Client + Note (visible, juste sous le header) */}
      {!vide && (onChoisirClient || onModifierNote) && (
        <div className="px-3 py-2.5 border-b border-border bg-muted/10 space-y-2">
          {onChoisirClient && (
            <button
              type="button"
              onClick={onChoisirClient}
              className={`w-full flex items-center gap-2.5 text-sm rounded-md px-2 py-1.5 transition-colors ${
                client
                  ? "bg-accent/10 text-accent hover:bg-accent/15"
                  : "text-muted hover:text-foreground hover:bg-foreground/5 border border-dashed border-border"
              }`}
            >
              <User size={15} strokeWidth={2} className="shrink-0" />
              {client ? (
                <span className="truncate font-medium flex-1 text-left">
                  {client.nom ?? client.telephone ?? "Client"}
                  {client.telephone && client.nom && (
                    <span className="text-accent/70 ml-1.5 font-normal text-xs">· {client.telephone}</span>
                  )}
                </span>
              ) : (
                <span className="font-medium">+ Associer un client</span>
              )}
            </button>
          )}
          {onModifierNote && (
            <div
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                note
                  ? "bg-warning/10 border border-warning/30"
                  : "border border-dashed border-border focus-within:border-foreground/30"
              }`}
            >
              <StickyNote
                size={15}
                strokeWidth={2}
                className={`shrink-0 ${note ? "text-warning" : "text-muted"}`}
              />
              <input
                type="text"
                value={note}
                onChange={(e) => onModifierNote(e.target.value)}
                placeholder="+ Ajouter une note (Table 3, A emporter...)"
                className={`flex-1 text-sm bg-transparent outline-none placeholder:text-muted ${
                  note ? "text-warning font-medium" : "text-foreground"
                }`}
                maxLength={120}
              />
            </div>
          )}
        </div>
      )}

      {/* Liste des lignes */}
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

      {/* Footer : actions + total compact */}
      <footer className="border-t border-border p-3 space-y-2.5 bg-surface safe-bottom">
        {/* Actions secondaires regroupees : Remise ticket + Apercu */}
        {!vide && (onAppliquerRemiseGlobale || onApercu) && (
          <div className="flex gap-1.5">
            {onAppliquerRemiseGlobale && (
              <Button
                variant="ghost"
                className={`flex-1 gap-1.5 text-xs font-medium px-2 py-1.5 h-auto min-w-0 rounded-md border transition-colors ${
                  aRemise
                    ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15"
                    : "border-dashed border-warning/40 text-warning hover:bg-warning/10"
                }`}
                onPress={onAppliquerRemiseGlobale}
              >
                <Tag size={12} strokeWidth={2.2} />
                {aRemise
                  ? `-${formatMontant(remiseGlobale!.montant)} F${
                      remiseGlobale!.type === "POURCENTAGE" ? ` (${remiseGlobale!.valeurOriginale}%)` : ""
                    }`
                  : "+ Remise"}
              </Button>
            )}
            {onApercu && (
              <Button
                variant="ghost"
                className="gap-1.5 text-xs font-medium px-2.5 py-1.5 h-auto min-w-0 rounded-md border border-border text-muted hover:text-foreground hover:bg-foreground/5"
                onPress={onApercu}
                aria-label="Aperçu du ticket"
              >
                <Eye size={12} strokeWidth={2.2} />
                Aperçu
              </Button>
            )}
          </div>
        )}

        {/* Bandeau total compact : sous-total toujours, remise si applicable, total */}
        <div className="px-3 py-2.5 rounded-xl bg-navy space-y-1">
          <div className="flex justify-between text-[11px] text-navy-foreground/55">
            <span>Sous-total {nombreArticles > 0 && `· ${nombreArticles} art.`}</span>
            <span className="tabular-nums">{formatMontant(sousTotal)} F</span>
          </div>
          {aRemise && (
            <div className="flex justify-between text-[11px] text-warning">
              <span className="flex items-center gap-1 min-w-0">
                <span>Remise</span>
                {remiseGlobale!.raison && (
                  <span className="text-navy-foreground/40 truncate max-w-[110px]">
                    · {remiseGlobale!.raison}
                  </span>
                )}
                {onRetirerRemiseGlobale && (
                  <button
                    type="button"
                    onClick={onRetirerRemiseGlobale}
                    className="ml-0.5 p-0.5 hover:bg-warning/20 rounded"
                    aria-label="Retirer la remise"
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
              <span className="tabular-nums">- {formatMontant(remiseGlobale!.montant)} F</span>
            </div>
          )}
          <div className="flex items-end justify-between gap-2 pt-0.5">
            <span className="text-[10px] text-navy-foreground/60 uppercase tracking-wider">Total</span>
            <span className="text-3xl font-bold text-navy-foreground tabular-nums tracking-tight leading-none">
              {formatMontant(total)}
              <span className="text-sm font-normal text-navy-foreground/50 ml-1">F</span>
            </span>
          </div>
        </div>

        {/* Boutons primaires */}
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
            className="px-4 border-warning/40 text-warning hover:bg-warning/5"
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
