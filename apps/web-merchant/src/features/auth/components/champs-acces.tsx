"use client";

import { TextField, Label, Input } from "@heroui/react";
import type { Currency } from "@libitex/shared";
import type { InscriptionDTO } from "../schemas/auth.schema";
import { ChampDevise } from "./champ-devise";

interface Props {
  motDePasse: string;
  devise: string;
  onChange: (champ: keyof InscriptionDTO, valeur: string) => void;
}

export function ChampsAcces({ motDePasse, devise, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField isRequired name="motDePasse" type="password" value={motDePasse} onChange={(v) => onChange("motDePasse", v)}>
        <Label>Mot de passe</Label>
        <Input placeholder="6 caractères minimum" />
      </TextField>
      <ChampDevise
        valeur={devise}
        onChange={(c: Currency) => onChange("devise", c)}
      />
    </div>
  );
}
