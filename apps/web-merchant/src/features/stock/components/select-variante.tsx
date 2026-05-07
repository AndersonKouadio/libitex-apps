"use client";

import { Select, ListBox, Label } from "@heroui/react";
import type { IProduit } from "@/features/catalogue/types/produit.type";

interface Props {
  produits: IProduit[];
  varianteId: string;
  onChange: (id: string) => void;
}

function libelleVariante(produit: IProduit, variante: IProduit["variantes"][number]): string {
  return variante.nom
    ? `${produit.nom} — ${variante.nom} (${variante.sku})`
    : `${produit.nom} (${variante.sku})`;
}

export function SelectVariante({ produits, varianteId, onChange }: Props) {
  const options = produits.flatMap((p) => p.variantes.map((v) => ({ id: v.id, label: libelleVariante(p, v) })));

  return (
    <Select
      isRequired
      name="varianteId"
      placeholder="Sélectionnez un article"
      selectedKey={varianteId}
      onSelectionChange={(key) => onChange(String(key))}
    >
      <Label>Produit / Variante</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((v) => (
            <ListBox.Item key={v.id} id={v.id} textValue={v.label}>
              {v.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
