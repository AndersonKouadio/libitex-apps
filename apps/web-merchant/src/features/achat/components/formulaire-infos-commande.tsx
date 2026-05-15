"use client";

import { Select, ListBox, Label, TextField, Input, TextArea, Card, Description } from "@heroui/react";
import { ChampDate } from "@/components/forms/champ-date";
import { DEVISES_FREQUENTES } from "../schemas/achat.schema";
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
  /** Phase A.5 : devise commande (ex CNY pour import Chine). Defaut XOF. */
  devise: string;
  /** Phase A.5 : taux de change devise -> XOF, fige a la creation. */
  tauxChange: number;
  onFournisseur: (v: string) => void;
  onEmplacement: (v: string) => void;
  onDate: (v: string) => void;
  onNotes: (v: string) => void;
  onDevise: (v: string) => void;
  onTauxChange: (v: number) => void;
}

/**
 * Carte gauche du formulaire de creation de commande : metadonnees
 * (fournisseur, emplacement, date attendue, notes). Stateless — le
 * parent garde le state.
 */
export function FormulaireInfosCommande({
  fournisseurs, emplacements,
  fournisseurId, emplacementId, dateAttendue, notes,
  devise, tauxChange,
  onFournisseur, onEmplacement, onDate, onNotes,
  onDevise, onTauxChange,
}: Props) {
  const enDeviseEtrangere = devise !== "XOF";
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

        {/* Phase A.5 : Devise commande + taux de change */}
        <Select
          selectedKey={devise}
          onSelectionChange={(k) => onDevise(String(k))}
          aria-label="Devise de la commande"
        >
          <Label>Devise de la commande</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {DEVISES_FREQUENTES.map((d) => (
                <ListBox.Item key={d} id={d} textValue={d}>{d}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {enDeviseEtrangere && (
          <TextField
            value={tauxChange > 0 ? String(tauxChange) : ""}
            onChange={(v) => onTauxChange(v === "" ? 0 : Number(v.replace(",", ".")))}
            isRequired
          >
            <Label>Taux de change (1 {devise} = ? XOF)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.000001"
              min="0"
              placeholder={devise === "EUR" ? "655.957" : devise === "USD" ? "615" : "91.5"}
            />
            <Description className="text-xs">
              Saisissez le taux negocie avec votre transitaire. Il sera fige
              et utilise pour convertir les prix en XOF.
            </Description>
          </TextField>
        )}

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
