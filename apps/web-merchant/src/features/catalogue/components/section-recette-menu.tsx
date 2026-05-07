"use client";

import { useState } from "react";
import { Button, Select, ListBox, Label, Input } from "@heroui/react";
import { Plus, X, Wheat } from "lucide-react";
import Link from "next/link";
import { useIngredientListQuery } from "@/features/ingredient/queries/ingredient-list.query";
import {
  UNITES_ORDONNEES, UNITE_LABELS, type UniteIngredient,
} from "@/features/ingredient/types/ingredient.type";
import type { LigneRecetteDTO } from "@/features/ingredient/schemas/ingredient.schema";

interface Props {
  lignes: LigneRecetteDTO[];
  onChange: (lignes: LigneRecetteDTO[]) => void;
}

export function SectionRecetteMenu({ lignes, onChange }: Props) {
  const { data: ingredients } = useIngredientListQuery();
  const [ingredientId, setIngredientId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState<UniteIngredient>("G");

  function ajouter() {
    const id = ingredientId.trim();
    const q = Number(quantite);
    if (!id || !q || q <= 0) return;
    if (lignes.some((l) => l.ingredientId === id)) return;
    onChange([...lignes, { ingredientId: id, quantite: q, unite }]);
    setIngredientId("");
    setQuantite("");
  }

  function retirer(index: number) {
    onChange(lignes.filter((_, i) => i !== index));
  }

  const ingredientsDisponibles = (ingredients ?? []).filter(
    (i) => !lignes.some((l) => l.ingredientId === i.id),
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Wheat size={16} className="text-warning" />
        <p className="text-sm font-semibold text-foreground">Recette du menu</p>
        <span className="text-xs text-muted">({lignes.length} ingrédient{lignes.length > 1 ? "s" : ""})</span>
      </div>

      {(ingredients ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-secondary/40 p-4 text-center">
          <p className="text-sm text-muted">Aucun ingrédient n'est encore déclaré.</p>
          <Link href="/ingredients" className="text-sm font-medium text-accent hover:underline">
            Ajouter mes ingrédients
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lignes.length > 0 && (
            <ul className="space-y-1.5">
              {lignes.map((l, i) => {
                const ing = ingredients?.find((x) => x.id === l.ingredientId);
                return (
                  <li
                    key={l.ingredientId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border"
                  >
                    <span className="flex-1 text-sm text-foreground truncate">
                      {ing?.nom ?? "Ingrédient"}
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {l.quantite} {UNITE_LABELS[l.unite]}
                    </span>
                    <Button
                      variant="ghost"
                      className="text-muted hover:text-danger p-1 h-auto min-w-0"
                      onPress={() => retirer(i)}
                      aria-label="Retirer"
                    >
                      <X size={14} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {ingredientsDisponibles.length > 0 && (
            <div className="rounded-xl border border-dashed border-border bg-surface-secondary/40 p-3 space-y-2">
              <Select
                selectedKey={ingredientId}
                onSelectionChange={(k) => {
                  const id = String(k);
                  setIngredientId(id);
                  const ing = ingredients?.find((x) => x.id === id);
                  if (ing) setUnite(ing.unite);
                }}
                placeholder="Choisir un ingrédient..."
              >
                <Label className="sr-only">Ingrédient</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {ingredientsDisponibles.map((i) => (
                      <ListBox.Item key={i.id} id={i.id} textValue={i.nom}>
                        {i.nom}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                <Input
                  type="number"
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  placeholder="Quantité par menu"
                  min="0"
                  step="0.001"
                />
                <Select
                  selectedKey={unite}
                  onSelectionChange={(k) => setUnite(String(k) as UniteIngredient)}
                  className="min-w-[80px]"
                >
                  <Label className="sr-only">Unité</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {UNITES_ORDONNEES.map((u) => (
                        <ListBox.Item key={u} id={u} textValue={UNITE_LABELS[u]}>
                          {UNITE_LABELS[u]}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Button
                  variant="secondary"
                  className="gap-1"
                  onPress={ajouter}
                  isDisabled={!ingredientId || !quantite}
                >
                  <Plus size={14} />
                  Ajouter
                </Button>
              </div>
            </div>
          )}

          {lignes.length === 0 && (
            <p className="text-xs text-muted">
              Ajoutez chaque ingrédient utilisé pour préparer une portion. Le stock sera décrémenté à chaque vente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
