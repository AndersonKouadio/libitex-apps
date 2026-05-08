"use client";

import { Button } from "@heroui/react";
import { Plus, X, Clock } from "lucide-react";
import type { PlanningDisponibilite, PlageHoraire } from "../types/produit.type";

const JOURS = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
  { id: "samedi", label: "Samedi" },
  { id: "dimanche", label: "Dimanche" },
] as const;

interface Props {
  planning: PlanningDisponibilite;
  onChange: (planning: PlanningDisponibilite) => void;
}

export function PlanningDisponibiliteEdition({ planning, onChange }: Props) {
  function ajouterPlage(jour: string) {
    const plages = planning[jour] ?? [];
    onChange({ ...planning, [jour]: [...plages, { from: "12:00", to: "14:00" }] });
  }

  function modifierPlage(jour: string, index: number, data: Partial<PlageHoraire>) {
    const plages = [...(planning[jour] ?? [])];
    plages[index] = { ...plages[index]!, ...data };
    onChange({ ...planning, [jour]: plages });
  }

  function retirerPlage(jour: string, index: number) {
    const plages = (planning[jour] ?? []).filter((_, i) => i !== index);
    const next = { ...planning };
    if (plages.length === 0) delete next[jour];
    else next[jour] = plages;
    onChange(next);
  }

  return (
    <div className="mt-3 ml-6 pl-3 border-l-2 border-accent/30 space-y-2">
      {JOURS.map((j) => {
        const plages = planning[j.id] ?? [];
        return (
          <div key={j.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${plages.length > 0 ? "text-foreground" : "text-muted"}`}>
                {j.label}
              </span>
              <Button
                variant="ghost"
                className="text-xs gap-1 px-2 py-0.5 h-auto min-w-0 text-accent hover:underline"
                onPress={() => ajouterPlage(j.id)}
              >
                <Plus size={11} />
                Ajouter une plage
              </Button>
            </div>
            {plages.length === 0 ? (
              <p className="text-[11px] text-muted/60 italic">Indisponible ce jour</p>
            ) : (
              <ul className="space-y-1">
                {plages.map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Clock size={12} className="text-muted shrink-0" />
                    <input
                      type="time"
                      value={p.from}
                      onChange={(e) => modifierPlage(j.id, i, { from: e.target.value })}
                      className="text-sm border border-border rounded-md px-2 py-1 bg-surface focus:outline-none focus:ring-1 focus:ring-accent/40"
                      aria-label="Heure de début"
                    />
                    <span className="text-xs text-muted">→</span>
                    <input
                      type="time"
                      value={p.to}
                      onChange={(e) => modifierPlage(j.id, i, { to: e.target.value })}
                      className="text-sm border border-border rounded-md px-2 py-1 bg-surface focus:outline-none focus:ring-1 focus:ring-accent/40"
                      aria-label="Heure de fin"
                    />
                    <Button
                      variant="ghost"
                      className="text-muted hover:text-danger p-1 h-auto min-w-0"
                      onPress={() => retirerPlage(j.id, i)}
                      aria-label="Retirer la plage"
                    >
                      <X size={12} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
