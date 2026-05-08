"use client";

import { TextField, Label, Input } from "@heroui/react";

interface Props {
  nomBoutique: string;
  slugBoutique: string;
  adresseBoutique: string;
  onChange: (champ: "nomBoutique" | "adresseBoutique", valeur: string) => void;
}

export function ChampsBoutique({ nomBoutique, slugBoutique, adresseBoutique, onChange }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Votre boutique</p>
      <div className="space-y-3">
        <TextField
          isRequired
          name="nomBoutique"
          value={nomBoutique}
          onChange={(v) => onChange("nomBoutique", v)}
        >
          <Label>Nom de la boutique</Label>
          <Input placeholder="Boutique Dakar Centre" />
        </TextField>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted">libitex.com/</span>
          <span className="text-xs font-mono text-foreground">{slugBoutique || "..."}</span>
        </div>
        <TextField
          name="adresseBoutique"
          value={adresseBoutique}
          onChange={(v) => onChange("adresseBoutique", v)}
        >
          <Label>Adresse du point de vente</Label>
          <Input placeholder="Plateau, avenue Pompidou — Dakar" />
        </TextField>
      </div>
    </div>
  );
}
