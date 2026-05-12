"use client";

import { Select, ListBox, Label, TextField, TextArea, Card } from "@heroui/react";
import { ChampDate } from "@/components/forms/champ-date";
import type { IFournisseur } from "../types/achat.type";

interface Emplacement {
  id: string;
  nom: string;
}

interface Props {
  fournisseurs: IFournisseur[];
  emplacements: Emplacement[];
  fournisseurId: string;
  emplacementId: string;
  dateAttendue: string;
  notes: string;
  onFournisseur: (v: string) => void;
  onEmplacement: (v: string) => void;
  onDate: (v: string) => void;
  onNotes: (v: string) => void;
}

/**
 * Carte gauche du formulaire de creation de commande : metadonnees
 * (fournisseur, emplacement, date attendue, notes). Stateless — le
 * parent garde le state.
 */
export function FormulaireInfosCommande({
  fournisseurs, emplacements,
  fournisseurId, emplacementId, dateAttendue, notes,
  onFournisseur, onEmplacement, onDate, onNotes,
}: Props) {
  return (
    <Card className="lg:col-span-1">
      <Card.Content className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Informations</p>
        <Select
          selectedKey={fournisseurId || undefined}
          onSelectionChange={(k) => onFournisseur(String(k))}
          aria-label="Fournisseur"
        >
          <Label>Fournisseur</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {fournisseurs.map((f) => (
                <ListBox.Item key={f.id} id={f.id} textValue={f.nom}>{f.nom}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select
          selectedKey={emplacementId || undefined}
          onSelectionChange={(k) => onEmplacement(String(k))}
          aria-label="Emplacement de livraison"
        >
          <Label>Emplacement de livraison</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {emplacements.map((e) => (
                <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <ChampDate
          label="Date de livraison attendue"
          value={dateAttendue}
          onChange={onDate}
        />
        <TextField value={notes} onChange={onNotes} maxLength={500}>
          <Label>Notes</Label>
          <TextArea rows={2} placeholder="Reference du fournisseur, instructions..." />
        </TextField>
      </Card.Content>
    </Card>
  );
}
