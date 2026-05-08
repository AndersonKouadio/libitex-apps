"use client";

import { TextField, Label, Input } from "@heroui/react";

interface Props {
  nomBoutique: string;
  slugBoutique: string;
  nomPointDeVente: string;
  adresseBoutique: string;
  onChange: (
    champ: "nomBoutique" | "nomPointDeVente" | "adresseBoutique",
    valeur: string,
  ) => void;
}

export function ChampsBoutique({
  nomBoutique, slugBoutique, nomPointDeVente, adresseBoutique, onChange,
}: Props) {
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
          name="nomPointDeVente"
          value={nomPointDeVente}
          onChange={(v) => onChange("nomPointDeVente", v)}
        >
          <Label>Nom du point de vente</Label>
          <Input placeholder="Boutique principale" />
        </TextField>
        <p className="text-[11px] text-muted/70 -mt-2 px-1">
          Vide → « Boutique principale ». Renommez-le quand vous ajouterez d'autres sites.
        </p>
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
