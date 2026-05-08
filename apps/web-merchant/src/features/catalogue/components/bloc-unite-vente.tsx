"use client";

import { TextField, Label, Input, Switch } from "@heroui/react";
import { Scale } from "lucide-react";
import type { CreerVarianteDTO } from "../schemas/produit.schema";
import { UniteMesure, UNITE_LABELS, uniteAccepteDecimal } from "@/features/unite/types/unite.type";
import { PAS_PAR_DEFAUT } from "@/features/unite/utils/unite";
import { SelectUnite } from "@/features/unite/components/select-unite";

interface Props {
  variante: CreerVarianteDTO;
  onChange: (data: Partial<CreerVarianteDTO>) => void;
}

/**
 * Bloc "Vente" d'un formulaire variante : choix de l'unite de mesure,
 * pas minimum a la saisie POS, et bascule "prix par unite vs forfaitaire".
 * Aligne automatiquement les champs quand l'utilisateur change d'unite
 * (ex: passe de PIECE a KG -> propose un pas de 0.1 kg).
 */
export function BlocUniteVente({ variante, onChange }: Props) {
  const uniteVente = variante.uniteVente ?? UniteMesure.PIECE;
  const accepteDecimal = uniteAccepteDecimal(uniteVente);

  function changerUnite(u: UniteMesure) {
    const decimalPrec = uniteAccepteDecimal(u);
    onChange({
      uniteVente: u,
      pasMin: decimalPrec ? (variante.pasMin ?? PAS_PAR_DEFAUT[u]) : undefined,
      prixParUnite: decimalPrec ? variante.prixParUnite : false,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface-secondary/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={14} className="text-muted" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Vente</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectUnite valeur={uniteVente} onChange={changerUnite} />
        {accepteDecimal && (
          <TextField
            name="pasMin"
            type="number"
            value={variante.pasMin ? String(variante.pasMin) : ""}
            onChange={(v) => onChange({ pasMin: v ? Number(v) : undefined })}
          >
            <Label>Pas minimum à la vente</Label>
            <Input placeholder={`${PAS_PAR_DEFAUT[uniteVente] ?? 0.1}`} min="0" step="0.001" />
          </TextField>
        )}
      </div>
      {accepteDecimal && (
        <Switch
          isSelected={variante.prixParUnite ?? false}
          onChange={(v) => onChange({ prixParUnite: v })}
        >
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <span className="text-sm">Prix de détail par {UNITE_LABELS[uniteVente]}</span>
            <p className="text-xs text-muted">
              Le total de la ligne au POS sera prix × quantité saisie.
            </p>
          </Switch.Content>
        </Switch>
      )}
    </div>
  );
}
