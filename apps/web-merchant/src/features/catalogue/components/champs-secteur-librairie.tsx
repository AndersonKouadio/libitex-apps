"use client";

import { TextField, Label, Input, FieldError } from "@heroui/react";
import { SelectChampLibre } from "./select-champ-libre";

const LANGUES = [
  "Français", "Anglais", "Arabe", "Wolof", "Bambara",
  "Lingala", "Espagnol", "Allemand", "Autre",
] as const;

interface Props {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}

export function ChampsSecteurLibrairie({ metadata, maj }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField value={String(metadata.isbn ?? "")} onChange={(v) => maj("isbn", v)}>
        <Label>ISBN</Label>
        <Input placeholder="978-2-1234-5678-9" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.auteur ?? "")} onChange={(v) => maj("auteur", v)}>
        <Label>Auteur</Label>
        <Input placeholder="Cheikh Anta Diop" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.editeur ?? "")} onChange={(v) => maj("editeur", v)}>
        <Label>Éditeur</Label>
        <Input placeholder="Présence Africaine" />
        <FieldError />
      </TextField>
      <SelectChampLibre
        label="Langue"
        valeur={String(metadata.langue ?? "")}
        options={LANGUES}
        onChange={(v) => maj("langue", v)}
      />
    </div>
  );
}
