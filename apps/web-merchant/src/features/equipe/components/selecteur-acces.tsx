"use client";

import { RadioGroup, Radio, CheckboxGroup, Checkbox } from "@heroui/react";
import { MapPin, Globe } from "lucide-react";
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
  function setMode(mode: string) {
    if (mode === "tous") {
      onChange({ accessAllLocations: true, locationIds: [] });
    } else {
      onChange({ accessAllLocations: false, locationIds });
    }
  }

  function setLocations(ids: string[]) {
    onChange({ accessAllLocations: false, locationIds: ids });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Accès aux emplacements</p>

      <RadioGroup
        value={accessAllLocations ? "tous" : "specifiques"}
        onChange={setMode}
        isDisabled={disabled}
        aria-label="Type d'accès aux emplacements"
        className="gap-2"
      >
        <Radio value="tous">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <div className="flex items-start gap-2">
              <Globe size={14} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground">Tous les emplacements</p>
                <p className="text-xs text-muted mt-0.5">
                  Accès à tous vos points de vente actuels et futurs.
                </p>
              </div>
            </div>
          </Radio.Content>
        </Radio>

        <Radio value="specifiques" isDisabled={emplacements.length === 0 || disabled}>
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground">Emplacements spécifiques</p>
                <p className="text-xs text-muted mt-0.5">
                  Limiter l'accès à un ou plusieurs points de vente.
                </p>
              </div>
            </div>
          </Radio.Content>
        </Radio>
      </RadioGroup>

      {!accessAllLocations && (
        <div className="ml-6 pl-3 border-l-2 border-warning/30 space-y-2">
          <p className="text-xs font-medium text-muted">Cochez les emplacements autorisés</p>
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
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <span className="flex items-center gap-2 text-sm">
                      <MapPin size={12} className="text-muted" />
                      {e.nom}
                    </span>
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </CheckboxGroup>
          )}
        </div>
      )}
    </div>
  );
}
