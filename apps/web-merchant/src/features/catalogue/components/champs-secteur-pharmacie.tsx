"use client";

import { TextField, Label, Input, FieldError, Switch } from "@heroui/react";
import { SelectChampLibre } from "./select-champ-libre";

const FORMES_GALENIQUES = [
  "Comprimé", "Comprimé effervescent", "Gélule", "Capsule", "Sirop",
  "Solution buvable", "Suspension", "Pommade", "Crème", "Gel",
  "Suppositoire", "Injection", "Collyre", "Aérosol", "Autre",
] as const;

interface Props {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}

export function ChampsSecteurPharmacie({ metadata, maj }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField value={String(metadata.dci ?? "")} onChange={(v) => maj("dci", v)}>
        <Label>DCI (Dénomination commune)</Label>
        <Input placeholder="Paracétamol" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.dosage ?? "")} onChange={(v) => maj("dosage", v)}>
        <Label>Dosage</Label>
        <Input placeholder="500 mg" />
        <FieldError />
      </TextField>
      <SelectChampLibre
        label="Forme galénique"
        valeur={String(metadata.formeGalenique ?? "")}
        options={FORMES_GALENIQUES}
        onChange={(v) => maj("formeGalenique", v)}
      />
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Sur ordonnance</p>
          <p className="text-xs text-muted">Délivrance soumise à prescription médicale.</p>
        </div>
        <Switch
          isSelected={Boolean(metadata.surOrdonnance)}
          onChange={(v) => maj("surOrdonnance", v)}
          aria-label="Sur ordonnance"
        />
      </div>
    </div>
  );
}
