"use client";

import { Button } from "@heroui/react";

export type PeriodeJours = 7 | 30 | 90;

const OPTIONS: Array<{ value: PeriodeJours; label: string }> = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
];

interface Props {
  valeur: PeriodeJours;
  onChange: (v: PeriodeJours) => void;
}

/**
 * Groupe de pilules pour la profondeur des graphiques du dashboard.
 * Pas un Select natif : la selection doit etre visible en 1 coup d'oeil
 * et changer la periode doit etre 1 clic, pas 2.
 */
export function SelecteurPeriode({ valeur, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      {OPTIONS.map((o) => {
        const actif = o.value === valeur;
        return (
          <Button
            key={o.value}
            variant={actif ? "primary" : "ghost"}
            className={`text-xs px-3 py-1 h-auto ${actif ? "" : "text-muted hover:text-foreground"}`}
            onPress={() => onChange(o.value)}
            aria-pressed={actif}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
