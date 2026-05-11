"use client";

import { Select, ListBox, Label, TextField, Input, Button } from "@heroui/react";
import { X } from "lucide-react";
import type { IEmplacement } from "../types/stock.type";

export interface FiltresMouvementsValeurs {
  type: string;
  emplacementId: string;
  dateDebut: string;
  dateFin: string;
}

interface Props {
  valeurs: FiltresMouvementsValeurs;
  onChange: (v: FiltresMouvementsValeurs) => void;
  emplacements: IEmplacement[];
  /** Liste des types affichables (varie selon variante / ingredient). */
  optionsType: Array<{ id: string; label: string }>;
}

/**
 * Bandeau de filtres pour la page Mouvements. Tous les filtres sont
 * optionnels et appliques en live (debounce TanStack via staleTime).
 * Bouton "Reinitialiser" reset tout d'un coup.
 */
export function FiltresMouvements({ valeurs, onChange, emplacements, optionsType }: Props) {
  const a_filtre =
    valeurs.type !== "" || valeurs.emplacementId !== "" || valeurs.dateDebut !== "" || valeurs.dateFin !== "";

  function set<K extends keyof FiltresMouvementsValeurs>(k: K, v: FiltresMouvementsValeurs[K]) {
    onChange({ ...valeurs, [k]: v });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
      <Select
        selectedKey={valeurs.type || "all"}
        onSelectionChange={(k) => set("type", k === "all" ? "" : String(k))}
      >
        <Label>Type</Label>
        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="all" textValue="Tous types">Tous types</ListBox.Item>
            {optionsType.map((o) => (
              <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}</ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        selectedKey={valeurs.emplacementId || "all"}
        onSelectionChange={(k) => set("emplacementId", k === "all" ? "" : String(k))}
      >
        <Label>Emplacement</Label>
        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="all" textValue="Tous les emplacements">Tous</ListBox.Item>
            {emplacements.map((e) => (
              <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <TextField type="date" value={valeurs.dateDebut} onChange={(v) => set("dateDebut", v)}>
        <Label>Du</Label>
        <Input />
      </TextField>

      <TextField type="date" value={valeurs.dateFin} onChange={(v) => set("dateFin", v)}>
        <Label>Au</Label>
        <Input />
      </TextField>

      <div className="flex items-end">
        <Button
          variant="ghost" className="gap-1.5 text-xs"
          onPress={() => onChange({ type: "", emplacementId: "", dateDebut: "", dateFin: "" })}
          isDisabled={!a_filtre}
        >
          <X size={14} />
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
