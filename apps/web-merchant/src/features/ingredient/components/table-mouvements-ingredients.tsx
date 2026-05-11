"use client";

import { Table, Chip } from "@heroui/react";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";
import { LABELS_MOUVEMENT_INGREDIENT } from "@/features/stock/utils/labels-mouvement";
import type { IMouvementIngredient } from "../types/ingredient.type";

interface Props {
  lignes: IMouvementIngredient[];
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

export function TableMouvementsIngredients({ lignes }: Props) {
  if (lignes.length === 0) {
    return (
      <p className="text-xs text-muted text-center py-10">
        Aucun mouvement pour ces filtres.
      </p>
    );
  }
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Mouvements d'ingrédients">
          <Table.Header className="table-header-libitex">
            <Table.Column isRowHeader>Date</Table.Column>
            <Table.Column>Type</Table.Column>
            <Table.Column>Ingrédient</Table.Column>
            <Table.Column>Emplacement</Table.Column>
            <Table.Column>Quantité</Table.Column>
            <Table.Column>Auteur</Table.Column>
            <Table.Column>Note</Table.Column>
          </Table.Header>
          <Table.Body>
            {lignes.map((m) => {
              const meta = LABELS_MOUVEMENT_INGREDIENT[m.type] ?? { label: m.type, couleur: "muted" };
              const positif = m.quantite > 0;
              return (
                <Table.Row key={m.id}>
                  <Table.Cell>
                    <span className="text-xs text-muted tabular-nums">
                      {FORMAT_DATE.format(new Date(m.creeLe))}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip className={`text-xs bg-${meta.couleur}/10 text-${meta.couleur}`}>
                      {meta.label}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <p className="text-sm font-medium text-foreground">{m.nomIngredient}</p>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-foreground">{m.nomEmplacement}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`text-sm font-semibold tabular-nums ${
                      positif ? "text-success" : m.quantite < 0 ? "text-danger" : "text-muted"
                    }`}>
                      {positif ? "+" : ""}{m.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                      <span className="text-[10px] font-normal text-muted ml-1">
                        {UNITE_LABELS[m.unite]}
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-muted">{m.auteur ?? "—"}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-muted line-clamp-1 max-w-xs">
                      {m.note ?? (m.reference ? `Réf. ${m.reference}` : "—")}
                    </span>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
