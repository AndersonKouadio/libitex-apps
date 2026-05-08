"use client";

import {
  Label, RadioGroup, Radio, CheckboxGroup, Checkbox,
} from "@heroui/react";
import { Calendar, MapPin } from "lucide-react";
import type {
  ModeDisponibilite, PlanningDisponibilite,
} from "../types/produit.type";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { PlanningDisponibiliteEdition } from "./planning-disponibilite";

interface Props {
  modeDisponibilite: ModeDisponibilite;
  planningDisponibilite: PlanningDisponibilite;
  emplacementsDisponibles: string[];
  onModeDisponibilite: (v: ModeDisponibilite) => void;
  onPlanningDisponibilite: (v: PlanningDisponibilite) => void;
  onEmplacementsDisponibles: (v: string[]) => void;
}

export function SectionDisponibilite({
  modeDisponibilite, planningDisponibilite, emplacementsDisponibles,
  onModeDisponibilite, onPlanningDisponibilite, onEmplacementsDisponibles,
}: Props) {
  const { data: emplacements } = useEmplacementListQuery();

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
          <PlanningDisponibiliteEdition
            planning={planningDisponibilite}
            onChange={onPlanningDisponibilite}
          />
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
