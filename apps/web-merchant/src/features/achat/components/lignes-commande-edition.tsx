"use client";

import {
  Button, Input, SearchField, Card, Skeleton,
} from "@heroui/react";
import { Trash2, Plus } from "lucide-react";
import { formatMontant } from "@/features/vente/utils/format";

export interface LigneEdition {
  varianteId: string;
  produitId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  quantite: number;
  prixUnitaire: number;
}

export interface VarianteDispo {
  produitId: string;
  varianteId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  prixAchat: number;
}

interface Props {
  lignes: LigneEdition[];
  recherche: string;
  variantesDispo: VarianteDispo[];
  chargementProduits: boolean;
  onAjouter: (v: VarianteDispo) => void;
  onQuantite: (idx: number, qte: number) => void;
  onPrix: (idx: number, prix: number) => void;
  onRetirer: (idx: number) => void;
  onRecherche: (v: string) => void;
}

/**
 * Carte droite du formulaire de creation de commande : edition des lignes
 * (quantite, prix, suppression) + recherche/ajout de produits a stock.
 * Stateless — le parent garde le state des lignes et de la recherche.
 */
export function LignesCommandeEdition({
  lignes, recherche, variantesDispo, chargementProduits,
  onAjouter, onQuantite, onPrix, onRetirer, onRecherche,
}: Props) {
  const total = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  return (
    <Card className="lg:col-span-2">
      <Card.Content className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Lignes ({lignes.length})
          </p>
          <p className="text-sm font-bold tabular-nums">
            Total : {formatMontant(total)} F
          </p>
        </div>

        {lignes.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">
            Aucune ligne. Recherchez un produit ci-dessous pour ajouter.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header de colonnes pour lever l'ambiguite des champs.
                Largeurs alignees avec les inputs des lignes. */}
            <div className="flex items-center gap-2 px-2 text-xs font-medium text-muted">
              <div className="flex-1 min-w-0">Produit</div>
              <div className="w-28 text-right shrink-0">Quantite</div>
              <div className="w-36 text-right shrink-0">Prix unitaire</div>
              <div className="w-32 text-right shrink-0">Total</div>
              <div className="w-8 shrink-0" />
            </div>

            {lignes.map((l, i) => (
              <div key={`${l.varianteId}-${i}`} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.nomProduit}</p>
                  <p className="text-xs text-muted truncate">
                    {l.nomVariante ? `${l.nomVariante} · ` : ""}{l.sku}
                  </p>
                </div>
                {/* Input natif type=number : plus de wrapper Group / steppers
                    qui mangent l'espace interne. Le contenu remplit toute
                    la largeur visible du champ. */}
                <Input
                  type="number"
                  inputMode="decimal"
                  step={0.001}
                  min={0}
                  value={Number.isFinite(l.quantite) ? String(l.quantite) : "0"}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Number(e.target.value);
                    onQuantite(i, Number.isFinite(v) ? v : 0);
                  }}
                  aria-label="Quantite a commander"
                  placeholder="Qte"
                  className="w-28 shrink-0 text-right tabular-nums px-2"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  step={1}
                  min={0}
                  value={Number.isFinite(l.prixUnitaire) ? String(l.prixUnitaire) : "0"}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Number(e.target.value);
                    onPrix(i, Number.isFinite(v) ? v : 0);
                  }}
                  aria-label="Prix unitaire d'achat"
                  placeholder="Prix"
                  className="w-36 shrink-0 text-right tabular-nums px-2"
                />
                <span className="w-32 text-right text-sm font-semibold tabular-nums shrink-0">
                  {formatMontant(l.quantite * l.prixUnitaire)} F
                </span>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 min-w-0 text-danger shrink-0"
                  aria-label="Retirer"
                  onPress={() => onRetirer(i)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted mb-2">Ajouter un produit</p>
          <SearchField
            value={recherche}
            onChange={onRecherche}
            aria-label="Rechercher un produit a ajouter"
            className="mb-2 w-full"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Rechercher par nom, variante ou SKU" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {chargementProduits ? (
            // Skeleton plutot qu'un loader : occupe l'espace exact
            // attendu, evite le saut visuel quand les vraies lignes arrivent.
            <div className="max-h-60 overflow-y-auto space-y-1">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {variantesDispo.length === 0 ? (
                <p className="text-xs text-muted text-center py-3">Aucun resultat</p>
              ) : (
                variantesDispo.map((v) => (
                  <button
                    key={v.varianteId}
                    type="button"
                    onClick={() => onAjouter(v)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left rounded hover:bg-surface-secondary"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{v.nomProduit}</span>
                      <span className="text-xs text-muted block truncate">
                        {v.nomVariante ? `${v.nomVariante} · ` : ""}{v.sku}
                      </span>
                    </span>
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {formatMontant(v.prixAchat)} F
                    </span>
                    <Plus size={14} className="text-accent shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
