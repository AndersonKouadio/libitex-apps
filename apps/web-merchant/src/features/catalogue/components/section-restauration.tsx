"use client";

import {
  TextField, Label, Input, FieldError, Switch,
  Select, ListBox, CheckboxGroup, Checkbox,
} from "@heroui/react";
import { Clock, Tag, Flame, AlertTriangle, UtensilsCrossed } from "lucide-react";
import type { NiveauEpice } from "../types/produit.type";

interface Props {
  cookingTimeMinutes: number | null;
  prixPromotion: number | null;
  enPromotion: boolean;
  niveauEpice: NiveauEpice | null;
  tagsCuisine: string[];
  enRupture: boolean;
  onCookingTimeMinutes: (v: number | null) => void;
  onPrixPromotion: (v: number | null) => void;
  onEnPromotion: (v: boolean) => void;
  onNiveauEpice: (v: NiveauEpice | null) => void;
  onTagsCuisine: (v: string[]) => void;
  onEnRupture: (v: boolean) => void;
}

const TAGS_DISPONIBLES = [
  { id: "VEGAN", label: "Vegan" },
  { id: "VEGETARIEN", label: "Végétarien" },
  { id: "SANS_GLUTEN", label: "Sans gluten" },
  { id: "SANS_LACTOSE", label: "Sans lactose" },
  { id: "HALAL", label: "Halal" },
  { id: "CASHER", label: "Casher" },
  { id: "BIO", label: "Bio" },
  { id: "MAISON", label: "Fait maison" },
  { id: "NOUVEAU", label: "Nouveauté" },
  { id: "SIGNATURE", label: "Signature" },
] as const;

const NIVEAUX_EPICE: { id: NiveauEpice; label: string; description: string }[] = [
  { id: "AU_CHOIX", label: "Au choix du client", description: "Le client peut commander épicé ou non." },
  { id: "TOUJOURS_EPICE", label: "Toujours épicé", description: "Le plat est toujours servi épicé." },
  { id: "JAMAIS_EPICE", label: "Jamais épicé", description: "Le plat n'est jamais épicé." },
];

export function SectionRestauration(props: Props) {
  return (
    <section className="space-y-4">
      <header className="flex items-start gap-3 pb-2 border-b border-border">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-warning/10 text-warning">
          <UtensilsCrossed size={16} strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Spécificités restauration</h3>
          <p className="text-xs text-muted mt-0.5">
            Temps de préparation, promo, niveau d'épice et tags régime.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          type="number"
          value={props.cookingTimeMinutes !== null ? String(props.cookingTimeMinutes) : ""}
          onChange={(v) => props.onCookingTimeMinutes(v ? Number(v) : null)}
        >
          <Label className="flex items-center gap-1.5">
            <Clock size={12} />
            Temps de préparation (min)
          </Label>
          <Input placeholder="15" min="0" />
          <FieldError />
        </TextField>

        <Select
          selectedKey={props.niveauEpice ?? "AU_CHOIX"}
          onSelectionChange={(k) => props.onNiveauEpice(k as NiveauEpice)}
          aria-label="Niveau épicé"
        >
          <Label className="flex items-center gap-1.5">
            <Flame size={12} />
            Niveau d'épice
          </Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {NIVEAUX_EPICE.map((n) => (
                <ListBox.Item key={n.id} id={n.id} textValue={n.label}>
                  <div>
                    <p className="text-sm">{n.label}</p>
                    <p className="text-[10px] text-muted">{n.description}</p>
                  </div>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-accent" />
            <p className="text-sm font-medium text-foreground">Promotion active</p>
          </div>
          <Switch
            isSelected={props.enPromotion}
            onChange={props.onEnPromotion}
            aria-label="En promotion"
          />
        </div>
        {props.enPromotion && (
          <TextField
            type="number"
            value={props.prixPromotion !== null ? String(props.prixPromotion) : ""}
            onChange={(v) => props.onPrixPromotion(v ? Number(v) : null)}
          >
            <Label>Prix promo (F CFA)</Label>
            <Input placeholder="2500" min="0" />
            <FieldError />
          </TextField>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground mb-2 block">
          Tags & régimes
        </Label>
        <CheckboxGroup
          value={props.tagsCuisine}
          onChange={(v) => props.onTagsCuisine(v as string[])}
          className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
          aria-label="Tags cuisine"
        >
          {TAGS_DISPONIBLES.map((t) => (
            <Checkbox key={t.id} value={t.id}>
              <span className="text-xs">{t.label}</span>
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border">
        <div className="min-w-0 flex items-start gap-2">
          <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">En rupture</p>
            <p className="text-xs text-muted">
              Masque le menu au POS sans le supprimer (à réactiver dès que disponible).
            </p>
          </div>
        </div>
        <Switch
          isSelected={props.enRupture}
          onChange={props.onEnRupture}
          aria-label="En rupture"
        />
      </div>
    </section>
  );
}
