"use client";

import { TextField, Label, Input, Button } from "@heroui/react";
import { Plus, Sparkles } from "lucide-react";
import type { CreerVarianteDTO } from "../schemas/produit.schema";
import type { AxeAttribut } from "../utils/generer-variantes";
import { LigneAxeAttribut } from "./ligne-axe-attribut";

interface Props {
  prefixeSku: string;
  axes: AxeAttribut[];
  variantesGenerees: CreerVarianteDTO[];
  prixDetailReference: string;
  onPrefixe: (v: string) => void;
  onPrixReference: (v: string) => void;
  onAjouterAxe: () => void;
  onRetirerAxe: (i: number) => void;
  onModifierAxe: (i: number, data: Partial<AxeAttribut>) => void;
}

function formatMontant(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

export function SectionVariantesAttributs({
  prefixeSku, axes, variantesGenerees, prixDetailReference,
  onPrefixe, onPrixReference, onAjouterAxe, onRetirerAxe, onModifierAxe,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField name="prefixeSku" value={prefixeSku} onChange={onPrefixe}>
          <Label>Prefixe SKU</Label>
          <Input placeholder="TSHRT, CHEM..." />
        </TextField>
        <TextField name="prixDetailReference" type="number" value={prixDetailReference} onChange={onPrixReference}>
          <Label>Prix de détail (F CFA)</Label>
          <Input placeholder="15 000" min="0" />
        </TextField>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Attributs</p>
          <Button variant="ghost" className="gap-1.5 text-xs" onPress={onAjouterAxe}>
            <Plus size={14} />
            Ajouter un attribut
          </Button>
        </div>
        <div className="space-y-2">
          {axes.map((axe, i) => (
            <LigneAxeAttribut
              key={i}
              index={i}
              axe={axe}
              onChange={onModifierAxe}
              onRetirer={onRetirerAxe}
              peutRetirer={axes.length > 1}
            />
          ))}
        </div>
      </div>

      {variantesGenerees.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-accent" />
            <p className="text-sm font-semibold text-foreground">
              {variantesGenerees.length} variante{variantesGenerees.length > 1 ? "s" : ""} generee{variantesGenerees.length > 1 ? "s" : ""}
            </p>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
            {variantesGenerees.slice(0, 12).map((v, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-1 rounded bg-surface">
                <span className="font-mono text-xs text-muted">{v.sku || "—"}</span>
                <span className="flex-1 truncate text-foreground">{v.nom}</span>
                <span className="text-xs text-muted tabular-nums">{formatMontant(v.prixDetail)} F</span>
              </li>
            ))}
            {variantesGenerees.length > 12 && (
              <li className="text-xs text-muted px-2 py-1">… {variantesGenerees.length - 12} autres</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
