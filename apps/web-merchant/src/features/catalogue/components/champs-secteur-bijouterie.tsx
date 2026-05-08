"use client";

import { TextField, Label, Input, FieldError } from "@heroui/react";
import { SelectChampLibre } from "./select-champ-libre";

const MATIERES = [
  "Or jaune", "Or blanc", "Or rose", "Argent", "Plaqué or",
  "Plaqué argent", "Acier inoxydable", "Acier chirurgical",
  "Cuivre", "Laiton", "Autre",
] as const;

const CARATS = [
  "24K (999)", "22K (916)", "21K (875)", "18K (750)", "14K (583)", "9K (375)",
  "925 (Argent)", "950 (Argent)", "Plaqué", "Non précisé",
] as const;

const PIERRES = [
  "Sans pierre", "Diamant", "Saphir", "Rubis", "Émeraude",
  "Topaze", "Améthyste", "Perle", "Zircon", "Autre",
] as const;

interface Props {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}

export function ChampsSecteurBijouterie({ metadata, maj }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <SelectChampLibre
        label="Matière"
        valeur={String(metadata.matiere ?? "")}
        options={MATIERES}
        onChange={(v) => maj("matiere", v)}
      />
      <SelectChampLibre
        label="Carat / titre"
        valeur={String(metadata.carat ?? "")}
        options={CARATS}
        onChange={(v) => maj("carat", v)}
      />
      <TextField
        value={String(metadata.poidsGrammes ?? "")}
        onChange={(v) => maj("poidsGrammes", v ? Number(v) : undefined)}
      >
        <Label>Poids (grammes)</Label>
        <Input type="number" inputMode="decimal" placeholder="3.50" />
        <FieldError />
      </TextField>
      <SelectChampLibre
        label="Pierre / gemme"
        valeur={String(metadata.pierre ?? "")}
        options={PIERRES}
        onChange={(v) => maj("pierre", v)}
      />
    </div>
  );
}
