"use client";

import { TextField, Label, Input, Select, ListBox } from "@heroui/react";
import type { InscriptionDTO } from "../schemas/auth.schema";

const DEVISES = [
  { id: "XOF", label: "Franc CFA BCEAO (XOF)" },
  { id: "XAF", label: "Franc CFA BEAC (XAF)" },
  { id: "USD", label: "Dollar US (USD)" },
  { id: "EUR", label: "Euro (EUR)" },
] as const;

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
        <Input placeholder="6 caracteres minimum" />
      </TextField>
      <Select
        name="devise"
        selectedKey={devise}
        onSelectionChange={(key) => onChange("devise", String(key))}
      >
        <Label>Devise</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {DEVISES.map((d) => (
              <ListBox.Item key={d.id} id={d.id} textValue={d.label}>{d.label}</ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
