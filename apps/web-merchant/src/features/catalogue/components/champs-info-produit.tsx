"use client";

import { TextField, Label, Input, Select, ListBox, Disclosure, TextArea } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import type { ICategorie } from "../types/produit.type";
import type { TypeProduit } from "../hooks/useFormProduit";

const TYPES_PRODUIT: Array<{ id: TypeProduit; label: string; description: string }> = [
  { id: "SIMPLE", label: "Standard", description: "Un seul SKU, sans variantes ni suivi unitaire." },
  { id: "VARIANT", label: "Avec variantes", description: "Génère une matrice (couleur, taille, matière...)." },
  { id: "SERIALIZED", label: "Sérialisé", description: "Numéros de série ou IMEI saisis à la réception." },
  { id: "PERISHABLE", label: "Périssable", description: "Suivi par lots et dates de péremption." },
  { id: "MENU", label: "Menu (recette)", description: "Plat composé d'ingrédients consommés à chaque vente." },
];

interface Props {
  nom: string;
  description: string;
  typeProduit: TypeProduit;
  marque: string;
  categorieId: string;
  codeBarresEan13: string;
  tauxTva: string;
  categories: ICategorie[];
  typesAutorises: TypeProduit[];
  onNom: (v: string) => void;
  onDescription: (v: string) => void;
  onTypeProduit: (v: TypeProduit) => void;
  onMarque: (v: string) => void;
  onCategorieId: (v: string) => void;
  onCodeBarresEan13: (v: string) => void;
  onTauxTva: (v: string) => void;
}

export function ChampsInfoProduit({
  nom, description, typeProduit, marque, categorieId, codeBarresEan13, tauxTva,
  categories, typesAutorises,
  onNom, onDescription, onTypeProduit, onMarque, onCategorieId, onCodeBarresEan13, onTauxTva,
}: Props) {
  const typesDisponibles = TYPES_PRODUIT.filter((t) => typesAutorises.includes(t.id));
  const typeSelectionne = TYPES_PRODUIT.find((t) => t.id === typeProduit);

  return (
    <div className="space-y-4">
      <TextField isRequired name="nom" value={nom} onChange={onNom}>
        <Label>Nom du produit</Label>
        <Input placeholder="Samsung Galaxy A15" />
      </TextField>

      <Select
        name="typeProduit"
        selectedKey={typeProduit}
        onSelectionChange={(key) => onTypeProduit(String(key) as TypeProduit)}
      >
        <Label>Type de produit</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {typesDisponibles.map((t) => (
              <ListBox.Item key={t.id} id={t.id} textValue={t.label}>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted">{t.description}</p>
                </div>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {typeSelectionne && (
        <p className="text-xs text-muted -mt-2">{typeSelectionne.description}</p>
      )}

      <TextField name="description" value={description} onChange={onDescription}>
        <Label>Description (optionnel)</Label>
        <TextArea placeholder="Specifications, points cles, conditions de garantie..." rows={2} />
      </TextField>

      <Disclosure className="rounded-lg border border-border bg-surface-secondary/30">
        <Disclosure.Heading>
          <Disclosure.Trigger className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-secondary/60 rounded-lg transition-colors">
            <span className="flex items-center gap-2">
              <ChevronDown size={14} className="text-muted transition-transform group-data-[expanded]:rotate-180" />
              Détails avancés
              <span className="text-xs text-muted font-normal">— marque, catégorie, code-barres, TVA</span>
            </span>
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content className="px-3 pb-3 pt-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField name="marque" value={marque} onChange={onMarque}>
                <Label>Marque</Label>
                <Input placeholder="Samsung, Nike..." />
              </TextField>
              <Select
                name="categorieId"
                selectedKey={categorieId || undefined}
                onSelectionChange={(key) => onCategorieId(key ? String(key) : "")}
                isDisabled={categories.length === 0}
                placeholder={categories.length === 0 ? "Aucune catégorie" : "Sélectionner..."}
              >
                <Label>Catégorie</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {categories.map((c) => (
                      <ListBox.Item key={c.id} id={c.id} textValue={c.nom}>
                        {c.nom}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField name="codeBarresEan13" value={codeBarresEan13} onChange={onCodeBarresEan13}>
                <Label>Code-barres EAN-13 (optionnel)</Label>
                <Input placeholder="3017620422003" />
              </TextField>
              <TextField name="tauxTva" type="number" value={tauxTva} onChange={onTauxTva}>
                <Label>Taux TVA (%)</Label>
                <Input placeholder="18" min="0" max="100" />
              </TextField>
            </div>
        </Disclosure.Content>
      </Disclosure>
    </div>
  );
}
