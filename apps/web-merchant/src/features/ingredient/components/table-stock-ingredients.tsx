"use client";

import { useMemo, useState } from "react";
import { Table, SearchField, Input } from "@heroui/react";
import { AlertTriangle, Wheat } from "lucide-react";
import { BoutonTri, basculerTri, type EtatTri } from "@/components/data/bouton-tri";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";
import { formatMontantXOF } from "@/features/stock/utils/calcul-kpi";
import type { LigneStockIngredient } from "../utils/calcul-kpi";

type ColTri = "nom" | "quantite" | "seuilAlerte" | "prixUnitaire" | "valeur";

interface Props {
  lignes: LigneStockIngredient[];
  filtreAlerte: boolean;
}

export function TableStockIngredients({ lignes, filtreAlerte }: Props) {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<EtatTri<ColTri>>({ col: null, ordre: "asc" });

  const filtre = recherche.trim().toLowerCase();
  const lignesAffichees = useMemo(() => {
    let l = lignes;
    if (filtre) l = l.filter((x) => x.ingredient.nom.toLowerCase().includes(filtre));
    if (filtreAlerte) l = l.filter((x) => x.enAlerte || x.quantite <= 0);
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
  }, [lignes, filtre, filtreAlerte, tri]);

  const onTri = (c: ColTri) => setTri((p) => basculerTri(p, c));

  return (
    <div className="space-y-3">
      <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un ingrédient">
        <Input placeholder="Rechercher un ingrédient…" className="max-w-sm" />
      </SearchField>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Stock ingrédients par emplacement">
            <Table.Header className="table-header-libitex">
              <Table.Column isRowHeader>
                <BoutonTri col="nom" label="Ingrédient" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="quantite" label="Stock actuel" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="seuilAlerte" label="Seuil d'alerte" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="prixUnitaire" label="Coût unitaire" tri={tri} onTri={onTri} />
              </Table.Column>
              <Table.Column>
                <BoutonTri col="valeur" label="Valeur" tri={tri} onTri={onTri} />
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {lignesAffichees.map(({ ingredient: i, quantite, enAlerte, valeur }) => {
                const enRupture = quantite <= 0;
                return (
                  <Table.Row key={i.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                          <Wheat size={12} />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{i.nom}</p>
                          <p className="text-[10px] text-muted">en {UNITE_LABELS[i.unite]}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={`text-sm font-semibold tabular-nums inline-flex items-center gap-1 ${
                        enRupture ? "text-danger" : enAlerte ? "text-warning" : "text-foreground"
                      }`}>
                        {(enRupture || enAlerte) && <AlertTriangle size={12} />}
                        {quantite.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                        <span className="text-[10px] font-normal text-muted ml-0.5">
                          {UNITE_LABELS[i.unite]}
                        </span>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-muted tabular-nums">
                        {i.seuilAlerte > 0 ? `${i.seuilAlerte} ${UNITE_LABELS[i.unite]}` : "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-muted tabular-nums">
                        {i.prixUnitaire > 0
                          ? `${i.prixUnitaire.toLocaleString("fr-FR")} F / ${UNITE_LABELS[i.unite]}`
                          : "—"}
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
      {lignesAffichees.length === 0 && (
        <p className="text-xs text-muted text-center py-6">
          Aucun résultat {filtreAlerte ? "en alerte" : "pour cette recherche"}.
        </p>
      )}
    </div>
  );
}

function valeurTri(r: LigneStockIngredient, col: ColTri): string | number {
  switch (col) {
    case "nom": return r.ingredient.nom;
    case "quantite": return r.quantite;
    case "seuilAlerte": return r.ingredient.seuilAlerte;
    case "prixUnitaire": return r.ingredient.prixUnitaire;
    case "valeur": return r.valeur;
  }
}
