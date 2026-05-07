"use client";

import { TextField, Label, Input, Select, ListBox } from "@heroui/react";

const TYPES_PRODUIT = [
  { id: "SIMPLE", label: "Standard" },
  { id: "VARIANT", label: "Variantes (taille, couleur...)" },
  { id: "SERIALIZED", label: "Serialise (IMEI, N/S)" },
  { id: "PERISHABLE", label: "Perissable (DLC)" },
] as const;

interface Props {
  nom: string;
  description: string;
  typeProduit: string;
  marque: string;
  onNom: (v: string) => void;
  onDescription: (v: string) => void;
  onTypeProduit: (v: string) => void;
  onMarque: (v: string) => void;
}

export function ChampsInfoProduit({
  nom, description, typeProduit, marque,
  onNom, onDescription, onTypeProduit, onMarque,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField isRequired className="sm:col-span-2" name="nom" value={nom} onChange={onNom}>
          <Label>Nom du produit</Label>
          <Input placeholder="Samsung Galaxy A15" />
        </TextField>

        <Select
          name="typeProduit"
          selectedKey={typeProduit}
          onSelectionChange={(key) => onTypeProduit(String(key))}
        >
          <Label>Type de produit</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {TYPES_PRODUIT.map((t) => (
                <ListBox.Item key={t.id} id={t.id} textValue={t.label}>
                  {t.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField name="marque" value={marque} onChange={onMarque}>
          <Label>Marque</Label>
          <Input placeholder="Samsung, Nike..." />
        </TextField>
      </div>

      <TextField name="description" value={description} onChange={onDescription}>
        <Label>Description</Label>
        <Input placeholder="Description courte du produit" />
      </TextField>
    </>
  );
}
