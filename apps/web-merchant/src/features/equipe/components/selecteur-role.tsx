"use client";

import { Select, ListBox, Label } from "@heroui/react";
import { ROLES_INVITABLES, ROLES_LABELS, ROLES_DESCRIPTIONS } from "../types/equipe.type";

export type RoleInvitable = "ADMIN" | "MANAGER" | "COMMERCIAL" | "CASHIER" | "WAREHOUSE";

interface Props {
  valeur: RoleInvitable;
  onChange: (role: RoleInvitable) => void;
  disabled?: boolean;
}

export function SelecteurRole({ valeur, onChange, disabled }: Props) {
  return (
    <Select
      isRequired
      isDisabled={disabled}
      selectedKey={valeur}
      onSelectionChange={(key) => onChange(String(key) as RoleInvitable)}
    >
      <Label>Rôle</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {ROLES_INVITABLES.map((r) => (
            <ListBox.Item key={r} id={r} textValue={ROLES_LABELS[r]}>
              <div>
                <p className="text-sm font-medium">{ROLES_LABELS[r]}</p>
                <p className="text-xs text-muted max-w-xs">{ROLES_DESCRIPTIONS[r]}</p>
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
