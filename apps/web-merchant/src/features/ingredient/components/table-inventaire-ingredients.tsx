"use client";

import { useMemo, useState } from "react";
import { Table, SearchField, Input } from "@heroui/react";
import { ArrowUpRight, ArrowDownRight, Equal, Wheat } from "lucide-react";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";
import type { LigneStockIngredient } from "../utils/calcul-kpi";

export interface ComptageIngredients {
  /** Map<ingredientId, quantiteReelle> — vide = pas compte. */
  comptages: Map<string, number>;
  setComptages: (m: Map<string, number>) => void;
}

interface Props {
  lignes: LigneStockIngredient[];
  comptage: ComptageIngredients;
}

export function TableInventaireIngredients({ lignes, comptage }: Props) {
  const [recherche, setRecherche] = useState("");
  const filtre = recherche.trim().toLowerCase();

  const lignesAffichees = useMemo(() => {
    if (!filtre) return lignes;
    return lignes.filter((l) => l.ingredient.nom.toLowerCase().includes(filtre));
  }, [lignes, filtre]);

  function setReelle(ingredientId: string, valeur: string) {
    const next = new Map(comptage.comptages);
    if (valeur === "") next.delete(ingredientId);
    else next.set(ingredientId, Number(valeur));
    comptage.setComptages(next);
  }

  return (
    <div className="space-y-3">
      <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un ingrédient">
        <Input placeholder="Rechercher un ingrédient…" className="max-w-sm" />
      </SearchField>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Comptage d'inventaire ingrédients">
            <Table.Header className="table-header-libitex">
              <Table.Column isRowHeader>Ingrédient</Table.Column>
              <Table.Column>Stock théorique</Table.Column>
              <Table.Column>Quantité réelle</Table.Column>
              <Table.Column>Écart</Table.Column>
            </Table.Header>
            <Table.Body>
              {lignesAffichees.map(({ ingredient: i, quantite }) => {
                const unite = UNITE_LABELS[i.unite];
                const reelleStr = comptage.comptages.has(i.id)
                  ? String(comptage.comptages.get(i.id))
                  : "";
                const reelle = reelleStr === "" ? null : Number(reelleStr);
                const delta = reelle == null ? null : reelle - quantite;
                return (
                  <Table.Row key={i.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                          <Wheat size={12} />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{i.nom}</p>
                          <p className="text-[10px] text-muted">en {unite}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm font-semibold tabular-nums">
                        {quantite.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {unite}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={reelleStr}
                        onChange={(e) => setReelle(i.id, e.target.value)}
                        placeholder="—"
                        className="w-28 px-2 py-1 text-sm text-right tabular-nums rounded-md border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {delta == null ? (
                        <span className="text-xs text-muted">non compté</span>
                      ) : Math.abs(delta) < 0.001 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Equal size={12} /> aucun écart
                        </span>
                      ) : delta > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success tabular-nums">
                          <ArrowUpRight size={14} /> +{delta.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {unite}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-danger tabular-nums">
                          <ArrowDownRight size={14} /> {delta.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {unite}
                        </span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {lignesAffichees.length === 0 && (
        <p className="text-xs text-muted text-center py-6">Aucun résultat.</p>
      )}
    </div>
  );
}
