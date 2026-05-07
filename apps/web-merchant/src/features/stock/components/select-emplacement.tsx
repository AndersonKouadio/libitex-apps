"use client";

import { Select, ListBox, Label } from "@heroui/react";
import type { IEmplacement } from "../types/stock.type";

interface Props {
  emplacements: IEmplacement[];
  emplacementId: string;
  onChange: (id: string) => void;
  label?: string;
}

export function SelectEmplacement({ emplacements, emplacementId, onChange, label = "Emplacement de destination" }: Props) {
  const valeur = emplacementId || emplacements[0]?.id || "";

  return (
    <Select
      isRequired
      name="emplacementId"
      selectedKey={valeur}
      onSelectionChange={(key) => onChange(String(key))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {emplacements.map((e) => (
            <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>
              {e.nom}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
