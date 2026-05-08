"use client";

import { Switch, CheckboxGroup, Checkbox } from "@heroui/react";
import { MapPin } from "lucide-react";
import type { IEmplacement } from "@/features/stock/types/stock.type";

interface Props {
  accessAllLocations: boolean;
  locationIds: string[];
  emplacements: IEmplacement[];
  onChange: (data: { accessAllLocations: boolean; locationIds: string[] }) => void;
  disabled?: boolean;
}

export function SelecteurAcces({
  accessAllLocations, locationIds, emplacements, onChange, disabled,
}: Props) {
  function toggleAll(active: boolean) {
    onChange({ accessAllLocations: active, locationIds: active ? [] : locationIds });
  }

  function setLocations(ids: string[]) {
    onChange({ accessAllLocations: false, locationIds: ids });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Accès à tous les emplacements</p>
          <p className="text-xs text-muted mt-0.5">
            Le membre peut consulter et opérer sur tous vos points de vente actuels et futurs.
          </p>
        </div>
        <Switch
          isSelected={accessAllLocations}
          onChange={toggleAll}
          isDisabled={disabled}
          aria-label="Accès à tous les emplacements"
        />
      </div>

      {!accessAllLocations && (
        <div className="space-y-2 pl-1">
          <p className="text-xs font-medium text-muted">
            Sélectionnez les emplacements autorisés
          </p>
          {emplacements.length === 0 ? (
            <p className="text-sm text-muted italic">Aucun emplacement créé</p>
          ) : (
            <CheckboxGroup
              value={locationIds}
              onChange={(values) => setLocations(values as string[])}
              isDisabled={disabled}
              className="gap-1.5"
              aria-label="Emplacements autorisés"
            >
              {emplacements.map((e) => (
                <Checkbox key={e.id} value={e.id}>
                  <span className="flex items-center gap-2 text-sm">
                    <MapPin size={12} className="text-muted" />
                    {e.nom}
                  </span>
                </Checkbox>
              ))}
            </CheckboxGroup>
          )}
        </div>
      )}
    </div>
  );
}
