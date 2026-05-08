"use client";

import { Select, ListBox, Label } from "@heroui/react";
import {
  UniteMesure,
  UniteCategorie,
  UNITE_LABELS,
  UNITE_LABELS_LONGS,
  UNITES_PAR_CATEGORIE,
} from "../types/unite.type";
import { UNITES_ORDONNEES } from "../utils/unite";

interface Props {
  /** Unite courante. */
  valeur: UniteMesure;
  /** Callback de changement. */
  onChange: (unite: UniteMesure) => void;
  /** Libelle du champ. Defaut: "Unite de vente". */
  label?: string;
  /** Restreint le selecteur a une categorie precise (ex: POIDS uniquement). */
  categorie?: UniteCategorie;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * Selecteur d'unite de mesure. Si `categorie` est fournie, n'affiche que
 * les unites de cette categorie ; sinon affiche toutes les unites ordonnees
 * par categorie (UNITAIRE -> POIDS -> VOLUME -> LONGUEUR).
 */
export function SelectUnite({
  valeur, onChange, label = "Unité de vente", categorie, isRequired, isDisabled,
}: Props) {
  const unites = categorie ? UNITES_PAR_CATEGORIE[categorie] : UNITES_ORDONNEES;

  return (
    <Select
      isRequired={isRequired}
      isDisabled={isDisabled}
      selectedKey={valeur}
      onSelectionChange={(k) => onChange(String(k) as UniteMesure)}
    >
      <Label>{label}</Label>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover>
        <ListBox>
          {unites.map((u) => (
            <ListBox.Item key={u} id={u} textValue={UNITE_LABELS_LONGS[u]}>
              <span className="font-medium">{UNITE_LABELS[u]}</span>
              <span className="ml-2 text-xs text-muted">{UNITE_LABELS_LONGS[u]}</span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
