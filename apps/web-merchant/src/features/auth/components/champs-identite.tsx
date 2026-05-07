"use client";

import { TextField, Label, Input } from "@heroui/react";
import type { InscriptionDTO } from "../schemas/auth.schema";

interface Props {
  prenom: string;
  nomFamille: string;
  email: string;
  telephone: string;
  onChange: (champ: keyof InscriptionDTO, valeur: string) => void;
}

export function ChampsIdentite({ prenom, nomFamille, email, telephone, onChange }: Props) {
  return (
    <>
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Votre identité</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField isRequired name="prenom" value={prenom} onChange={(v) => onChange("prenom", v)}>
            <Label>Prénom</Label>
            <Input placeholder="Amadou" />
          </TextField>
          <TextField isRequired name="nomFamille" value={nomFamille} onChange={(v) => onChange("nomFamille", v)}>
            <Label>Nom</Label>
            <Input placeholder="Diallo" />
          </TextField>
        </div>
      </div>

      <div className="space-y-3">
        <TextField isRequired name="email" type="email" value={email} onChange={(v) => onChange("email", v)}>
          <Label>Adresse email</Label>
          <Input placeholder="amadou@boutique.sn" />
        </TextField>
        <TextField name="telephone" type="tel" value={telephone} onChange={(v) => onChange("telephone", v)}>
          <Label>Téléphone</Label>
          <Input placeholder="+221 77 000 12 34" />
        </TextField>
      </div>
    </>
  );
}
