"use client";

import {
  Label, RadioGroup, Radio, TagGroup, Tag,
} from "@heroui/react";
import type { Key } from "@heroui/react";
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
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <p className="text-sm text-foreground">Toujours disponible</p>
              <p className="text-xs text-muted mt-0.5">Vendable à toute heure d'ouverture.</p>
            </Radio.Content>
          </Radio>
          <Radio value="PROGRAMME">
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <p className="text-sm text-foreground">Sur plages horaires</p>
              <p className="text-xs text-muted mt-0.5">
                Limité à certains jours et créneaux (petit-déjeuner, brunch, plat du jour…).
              </p>
            </Radio.Content>
          </Radio>
        </RadioGroup>

        {modeDisponibilite === "PROGRAMME" && (
          <PlanningDisponibiliteEdition
            planning={planningDisponibilite}
            onChange={onPlanningDisponibilite}
          />
        )}
      </div>

      {(emplacements ?? []).length <= 1 ? (
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <MapPin size={12} />
            Emplacements de vente
          </Label>
          <p className="text-xs text-muted">
            Vous n'avez qu'un seul emplacement. Le produit y sera disponible automatiquement.
          </p>
        </div>
      ) : (
        <TagGroup
          selectionMode="multiple"
          selectedKeys={new Set(emplacementsDisponibles)}
          onSelectionChange={(keys) => {
            onEmplacementsDisponibles(Array.from(keys as Iterable<Key>).map(String));
          }}
        >
          <Label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <MapPin size={12} />
            Emplacements de vente
          </Label>
          <p className="text-xs text-muted mb-2">
            Cliquez sur les emplacements où ce produit est vendu. Si rien n'est sélectionné, il sera disponible partout.
          </p>
          <TagGroup.List className="flex flex-wrap gap-1.5">
            {(emplacements ?? []).map((e) => (
              <Tag key={e.id} id={e.id}>{e.nom}</Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      )}
    </section>
  );
}
