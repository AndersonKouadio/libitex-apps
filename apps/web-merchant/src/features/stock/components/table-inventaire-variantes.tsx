"use client";

import { useMemo, useState } from "react";
import { Table, SearchField, Input } from "@heroui/react";
import { ArrowUpRight, ArrowDownRight, Equal } from "lucide-react";
import type { IStockEmplacement } from "../types/stock.type";

export interface ComptageVariantes {
  /** Map<varianteId, quantiteReelle> — vide = pas compte. */
  comptages: Map<string, number>;
  setComptages: (m: Map<string, number>) => void;
}

interface Props {
  rows: IStockEmplacement[];
  comptage: ComptageVariantes;
}

/**
 * Tableau de comptage : chaque ligne = une variante avec son stock theorique
 * et un input pour la quantite reelle. L'ecart est calcule en temps reel.
 * Les lignes vides sont considerees "non comptees" (= pas d'ajustement).
 */
export function TableInventaireVariantes({ rows, comptage }: Props) {
  const [recherche, setRecherche] = useState("");
  const filtre = recherche.trim().toLowerCase();

  const lignes = useMemo(() => {
    if (!filtre) return rows;
    return rows.filter((r) =>
      r.nomProduit.toLowerCase().includes(filtre) || r.sku.toLowerCase().includes(filtre),
    );
  }, [rows, filtre]);

  function setReelle(varianteId: string, valeur: string) {
    const next = new Map(comptage.comptages);
    if (valeur === "") next.delete(varianteId);
    else next.set(varianteId, Number(valeur));
    comptage.setComptages(next);
  }

  return (
    <div className="space-y-3">
      <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un produit">
        <Input placeholder="Rechercher par nom ou SKU…" className="max-w-sm" />
      </SearchField>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Comptage d'inventaire produits">
            <Table.Header className="table-header-libitex">
              <Table.Column isRowHeader>Produit</Table.Column>
              <Table.Column>SKU</Table.Column>
              <Table.Column>Stock théorique</Table.Column>
              <Table.Column>Quantité réelle</Table.Column>
              <Table.Column>Écart</Table.Column>
            </Table.Header>
            <Table.Body>
              {lignes.map((s) => {
                const reelleStr = comptage.comptages.has(s.varianteId)
                  ? String(comptage.comptages.get(s.varianteId))
                  : "";
                const reelle = reelleStr === "" ? null : Number(reelleStr);
                const delta = reelle == null ? null : reelle - s.quantite;
                return (
                  <Table.Row key={s.varianteId}>
                    <Table.Cell>
                      <p className="text-sm font-medium text-foreground">{s.nomProduit}</p>
                      {s.nomVariante && <p className="text-xs text-muted">{s.nomVariante}</p>}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs font-mono text-muted">{s.sku}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm font-semibold tabular-nums">{s.quantite}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <input
                        type="number"
                        min={0}
                        value={reelleStr}
                        onChange={(e) => setReelle(s.varianteId, e.target.value)}
                        placeholder="—"
                        className="w-24 px-2 py-1 text-sm text-right tabular-nums rounded-md border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {delta == null ? (
                        <span className="text-xs text-muted">non compté</span>
                      ) : delta === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Equal size={12} /> aucun écart
                        </span>
                      ) : delta > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success tabular-nums">
                          <ArrowUpRight size={14} /> +{delta}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-danger tabular-nums">
                          <ArrowDownRight size={14} /> {delta}
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
      {lignes.length === 0 && (
        <p className="text-xs text-muted text-center py-6">Aucun résultat.</p>
      )}
    </div>
  );
}
