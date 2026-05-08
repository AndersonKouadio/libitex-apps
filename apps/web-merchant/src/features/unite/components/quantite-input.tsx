"use client";

import { TextField, Label, InputGroup } from "@heroui/react";
import { UniteMesure, UNITE_LABELS, uniteAccepteDecimal } from "../types/unite.type";

interface Props {
  /** Valeur courante en chaine pour eviter la perte de precision sur la saisie. */
  valeur: string;
  onChange: (valeur: string) => void;
  unite: UniteMesure;
  /** Pas minimum (ex: 0.1 pour KG). Si null, comportement entier seul. */
  pasMin?: number | null;
  label?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
}

/**
 * Input numerique decimal pour saisir une quantite avec son unite.
 * Calcule le step HTML a partir du `pasMin` de la variante, ou tombe a 1
 * pour les unites UNITAIRE sans pasMin defini. L'unite est affichee en suffixe.
 */
export function QuantiteInput({
  valeur, onChange, unite, pasMin, label = "Quantité", isRequired, isDisabled, placeholder,
}: Props) {
  const decimal = uniteAccepteDecimal(unite);
  const step = pasMin && pasMin > 0 ? pasMin : decimal ? 0.001 : 1;
  const placeholderEffectif = placeholder
    ?? (decimal ? `0${pasMin ? ` (par ${pasMin} ${UNITE_LABELS[unite]})` : ""}` : "1");

  return (
    <TextField
      isRequired={isRequired}
      isDisabled={isDisabled}
      type="number"
      value={valeur}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Input placeholder={placeholderEffectif} min="0" step={String(step)} />
        <InputGroup.Suffix>
          <span className="text-xs text-muted">{UNITE_LABELS[unite]}</span>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}
