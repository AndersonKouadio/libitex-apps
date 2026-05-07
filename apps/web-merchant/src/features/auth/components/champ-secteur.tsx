"use client";

import { Select, ListBox, Label, Chip } from "@heroui/react";
import type { SecteurActivite } from "../types/auth.type";
import {
  SECTEUR_LABELS, SECTEURS_ORDONNES, SECTEUR_TYPES_PRODUITS, TYPE_PRODUIT_LABELS,
} from "../utils/secteur-activite";

interface Props {
  valeur: SecteurActivite;
  onChange: (secteur: SecteurActivite) => void;
  isRequired?: boolean;
}

export function ChampSecteur({ valeur, onChange, isRequired }: Props) {
  const types = SECTEUR_TYPES_PRODUITS[valeur];

  return (
    <div className="space-y-2">
      <Select
        isRequired={isRequired}
        name="secteurActivite"
        selectedKey={valeur}
        onSelectionChange={(key) => onChange(String(key) as SecteurActivite)}
      >
        <Label>Secteur d'activite</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {SECTEURS_ORDONNES.map((s) => (
              <ListBox.Item key={s} id={s} textValue={SECTEUR_LABELS[s]}>
                {SECTEUR_LABELS[s]}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <div>
        <p className="text-xs text-muted mb-1.5">Types de produits proposes :</p>
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <Chip key={t} className="text-xs bg-accent/10 text-accent">
              {TYPE_PRODUIT_LABELS[t]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
