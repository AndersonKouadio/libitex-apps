"use client";

import { Select, ListBox, Label } from "@heroui/react";

interface Props {
  label: string;
  valeur: string;
  options: readonly string[];
  onChange: (v: string) => void;
}

/** Select simple a partir d'une liste de chaines (utilise par les sections metadata par secteur). */
export function SelectChampLibre({ label, valeur, options, onChange }: Props) {
  return (
    <Select
      selectedKey={valeur || null}
      onSelectionChange={(k) => onChange(k ? String(k) : "")}
      aria-label={label}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((opt) => (
            <ListBox.Item key={opt} id={opt} textValue={opt}>
              {opt}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
