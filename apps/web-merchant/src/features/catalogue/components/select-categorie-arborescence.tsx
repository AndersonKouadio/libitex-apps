"use client";

import { useMemo } from "react";
import { Select, ListBox, Label } from "@heroui/react";
import type { ICategorie } from "../types/produit.type";

interface Props {
  categories: ICategorie[];
  /** Valeur courante (id de la catégorie sélectionnée). Vide = "all" / aucune. */
  valeur: string;
  onChange: (id: string) => void;
  label: string;
  /** Libellé de l'option vide (ex. "Toutes catégories", "Aucune"). */
  optionVideLabel?: string;
  /** Si fourni, exclut cette catégorie ET ses descendants (utile pour le
   *  parent d'une catégorie en cours d'édition : éviter cycle). */
  exclureId?: string;
  className?: string;
  isDisabled?: boolean;
}

/**
 * Selecteur de categorie qui aplatit l'arbre parent → enfants en une liste
 * indentee par niveau, prefixee de "↳" pour les sous-categories. Utilise un
 * ListBox plat pour rester selectionnable a tous les niveaux.
 *
 * Reutilise dans /catalogue (filtre), formulaire produit (categorie du
 * produit) et modal categorie (categorie parent).
 */
export function SelectCategorieArborescence({
  categories, valeur, onChange, label, optionVideLabel,
  exclureId, className, isDisabled,
}: Props) {
  const items = useMemo(() => {
    type Item = { id: string; nom: string; niveau: number };
    const result: Item[] = [];

    // Set des ids exclus : la categorie elle-meme + tous ses descendants
    const exclus = new Set<string>();
    if (exclureId) {
      exclus.add(exclureId);
      function ajouterDescendants(parentId: string) {
        for (const c of categories) {
          if (c.parentId === parentId && !exclus.has(c.id)) {
            exclus.add(c.id);
            ajouterDescendants(c.id);
          }
        }
      }
      ajouterDescendants(exclureId);
    }

    const racines = categories.filter((c) => !c.parentId && !exclus.has(c.id));
    function ajouter(c: ICategorie, niveau: number) {
      result.push({ id: c.id, nom: c.nom, niveau });
      const enfants = categories.filter(
        (x) => x.parentId === c.id && !exclus.has(x.id),
      );
      for (const e of enfants) ajouter(e, niveau + 1);
    }
    for (const r of racines) ajouter(r, 0);
    return result;
  }, [categories, exclureId]);

  return (
    <Select
      selectedKey={valeur || "all"}
      onSelectionChange={(k) => onChange(String(k) === "all" ? "" : String(k))}
      aria-label={label}
      className={className}
      isDisabled={isDisabled}
    >
      <Label className="sr-only">{label}</Label>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="all" textValue={optionVideLabel ?? "Aucune"}>
            {optionVideLabel ?? "Aucune"}
          </ListBox.Item>
          {items.map((c) => (
            <ListBox.Item key={c.id} id={c.id} textValue={c.nom}>
              <span style={{ paddingLeft: `${c.niveau * 14}px` }}>
                {c.niveau > 0 && <span className="text-muted/50 mr-1">↳</span>}
                {c.nom}
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
