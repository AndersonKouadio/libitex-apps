"use client";

import {
  TextField, Label, Input, FieldError, RadioGroup, Radio,
  CheckboxGroup, Checkbox, Button,
} from "@heroui/react";
import { Calendar, MapPin, Plus, X, Clock } from "lucide-react";
import type {
  ModeDisponibilite, PlanningDisponibilite, PlageHoraire,
} from "../types/produit.type";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";

interface Props {
  modeDisponibilite: ModeDisponibilite;
  planningDisponibilite: PlanningDisponibilite;
  emplacementsDisponibles: string[];
  onModeDisponibilite: (v: ModeDisponibilite) => void;
  onPlanningDisponibilite: (v: PlanningDisponibilite) => void;
  onEmplacementsDisponibles: (v: string[]) => void;
}

const JOURS = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
  { id: "samedi", label: "Samedi" },
  { id: "dimanche", label: "Dimanche" },
] as const;

export function SectionDisponibilite({
  modeDisponibilite, planningDisponibilite, emplacementsDisponibles,
  onModeDisponibilite, onPlanningDisponibilite, onEmplacementsDisponibles,
}: Props) {
  const { data: emplacements } = useEmplacementListQuery();

  function ajouterPlage(jour: string) {
    const plages = planningDisponibilite[jour] ?? [];
    onPlanningDisponibilite({
      ...planningDisponibilite,
      [jour]: [...plages, { from: "12:00", to: "14:00" }],
    });
  }

  function modifierPlage(jour: string, index: number, data: Partial<PlageHoraire>) {
    const plages = [...(planningDisponibilite[jour] ?? [])];
    plages[index] = { ...plages[index]!, ...data };
    onPlanningDisponibilite({ ...planningDisponibilite, [jour]: plages });
  }

  function retirerPlage(jour: string, index: number) {
    const plages = (planningDisponibilite[jour] ?? []).filter((_, i) => i !== index);
    const next = { ...planningDisponibilite };
    if (plages.length === 0) delete next[jour];
    else next[jour] = plages;
    onPlanningDisponibilite(next);
  }

  return (
    <section className="space-y-4">
      <header className="flex items-start gap-3 pb-2 border-b border-border">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent/10 text-accent">
          <Calendar size={16} strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Disponibilité</h3>
          <p className="text-xs text-muted mt-0.5">
            Quand et où ce produit peut être vendu.
          </p>
        </div>
      </header>

      <div>
        <Label className="text-sm font-medium text-foreground mb-2 block">Plage horaire</Label>
        <RadioGroup
          value={modeDisponibilite}
          onChange={(v) => onModeDisponibilite(v as ModeDisponibilite)}
          aria-label="Mode de disponibilité"
          className="gap-2"
        >
          <Radio value="TOUJOURS">
            <div className="ml-2">
              <p className="text-sm text-foreground">Toujours disponible</p>
              <p className="text-xs text-muted mt-0.5">Vendable à toute heure d'ouverture.</p>
            </div>
          </Radio>
          <Radio value="PROGRAMME">
            <div className="ml-2">
              <p className="text-sm text-foreground">Sur plages horaires</p>
              <p className="text-xs text-muted mt-0.5">
                Limité à certains jours et créneaux (petit-déjeuner, brunch, plat du jour…).
              </p>
            </div>
          </Radio>
        </RadioGroup>

        {modeDisponibilite === "PROGRAMME" && (
          <div className="mt-3 ml-6 pl-3 border-l-2 border-accent/30 space-y-2">
            {JOURS.map((j) => {
              const plages = planningDisponibilite[j.id] ?? [];
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
        )}
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
          <MapPin size={12} />
          Emplacements de vente
        </Label>
        {(emplacements ?? []).length <= 1 ? (
          <p className="text-xs text-muted">
            Vous n'avez qu'un seul emplacement. Le produit y sera disponible automatiquement.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted mb-2">
              Cochez les emplacements où ce produit est vendu. Si vous laissez tout décoché, il sera disponible partout.
            </p>
            <CheckboxGroup
              value={emplacementsDisponibles}
              onChange={(v) => onEmplacementsDisponibles(v as string[])}
              className="space-y-1"
              aria-label="Emplacements"
            >
              {(emplacements ?? []).map((e) => (
                <Checkbox key={e.id} value={e.id}>
                  <span className="flex items-center gap-2 text-sm">
                    <MapPin size={11} className="text-muted" />
                    {e.nom}
                  </span>
                </Checkbox>
              ))}
            </CheckboxGroup>
          </>
        )}
      </div>
    </section>
  );
}
