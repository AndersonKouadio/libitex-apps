"use client";

import { Select, ListBox, Label } from "@heroui/react";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@libitex/shared";

interface Props {
  valeur: string;
  onChange: (devise: Currency) => void;
  isRequired?: boolean;
  label?: string;
}

export function ChampDevise({ valeur, onChange, isRequired, label = "Devise" }: Props) {
  return (
    <Select
      isRequired={isRequired}
      name="devise"
      selectedKey={valeur}
      onSelectionChange={(key) => onChange(String(key) as Currency)}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {CURRENCIES.map((c) => (
            <ListBox.Item key={c} id={c} textValue={CURRENCY_LABELS[c]}>
              {CURRENCY_LABELS[c]}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
