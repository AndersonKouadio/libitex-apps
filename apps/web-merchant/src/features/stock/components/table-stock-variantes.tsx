"use client";

import { useMemo, useState } from "react";
import { Table, Chip, SearchField, Input } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { BoutonTri, basculerTri, type EtatTri } from "@/components/data/bouton-tri";
import type { IStockEmplacement } from "../types/stock.type";
import { estEnAlerte, formatMontantXOF } from "../utils/calcul-kpi";

type ColTri = "nomProduit" | "sku" | "typeProduit" | "quantite" | "valeur";

const LABELS_TYPE: Record<string, string> = {
  SIMPLE: "Standard", VARIANT: "Variantes", SERIALIZED: "Sérialisé", PERISHABLE: "Périssable",
};

interface Props {
  rows: IStockEmplacement[];
  filtreAlerte: boolean;
}

/**
 * Tableau du stock par emplacement avec recherche live (nom/SKU), tri
 * colonnes, filtre Alerte stock, et badge rupture/faible. Le filtre
 * alerte est pilote depuis le parent (bandeau Alert clic).
 */
export function TableStockVariantes({ rows, filtreAlerte }: Props) {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<EtatTri<ColTri>>({ col: null, ordre: "asc" });

  const filtre = recherche.trim().toLowerCase();
  const lignes = useMemo(() => {
    let l = rows;
    if (filtre) {
      l = l.filter((s) =>
        s.nomProduit.toLowerCase().includes(filtre) || s.sku.toLowerCase().includes(filtre),
      );
    }
    if (filtreAlerte) l = l.filter((s) => estEnAlerte(s.quantite) !== "ok");
    if (tri.col) {
      const dir = tri.ordre === "asc" ? 1 : -1;
      l = [...l].sort((a, b) => {
        const va = valeurTri(a, tri.col!);
        const vb = valeurTri(b, tri.col!);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return l;
  }, [rows, filtre, filtreAlerte, tri]);

  const onTri = (c: ColTri) => setTri((p) => basculerTri(p, c));

  return (
    <div className="space-y-3">
      <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un produit">
        <Input placeholder="Rechercher par nom ou SKU…" className="max-w-sm" />
      </SearchField>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Stock par emplacement">
            <Table.Header className="table-header-libitex">
              <Table.Column isRowHeader>
                <BoutonTri col="nomProduit" label="Produit" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="sku" label="SKU" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="typeProduit" label="Type" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="quantite" label="Quantité" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="valeur" label="Valeur (PA)" tri={tri} onTri={onTri} />
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {lignes.map((s) => {
                const etat = estEnAlerte(s.quantite);
                const valeur = s.quantite * s.prixAchat;
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
                      <Chip className="text-xs">{LABELS_TYPE[s.typeProduit] || s.typeProduit}</Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={`text-sm font-semibold tabular-nums inline-flex items-center gap-1 ${
                        etat === "rupture" ? "text-danger"
                          : etat === "faible" ? "text-warning"
                          : "text-foreground"
                      }`}>
                        {etat !== "ok" && <AlertTriangle size={12} />}
                        {s.quantite.toLocaleString("fr-FR")}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-muted tabular-nums">
                        {valeur > 0 ? `${formatMontantXOF(valeur)} F` : "—"}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {lignes.length === 0 && (
        <p className="text-xs text-muted text-center py-6">
          Aucun résultat {filtreAlerte ? "en alerte" : "pour cette recherche"}.
        </p>
      )}
    </div>
  );
}

function valeurTri(r: IStockEmplacement, col: ColTri): string | number {
  switch (col) {
    case "nomProduit": return r.nomProduit;
    case "sku": return r.sku;
    case "typeProduit": return r.typeProduit;
    case "quantite": return r.quantite;
    case "valeur": return r.quantite * r.prixAchat;
  }
}
