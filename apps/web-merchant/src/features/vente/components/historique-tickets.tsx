"use client";

import { Table, Chip } from "@heroui/react";
import type { ITicket } from "../types/vente.type";
import { formatMontant, formatDate } from "../utils/format";

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PARKED: "En attente",
  COMPLETE: "Complete",
  COMPLETED: "Complete",
  ANNULE: "Annule",
  VOIDED: "Annule",
  OPEN: "Ouvert",
};

const CLASSES_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-warning/10 text-warning",
  COMPLETE: "bg-success/10 text-success",
  PARKED: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  ANNULE: "bg-danger/10 text-danger",
  VOIDED: "bg-danger/10 text-danger",
};

interface Props {
  tickets: ITicket[];
}

export function HistoriqueTickets({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border py-12 text-center">
        <p className="text-sm text-muted">Aucun ticket pour le moment</p>
      </div>
    );
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Historique des tickets">
          <Table.Header>
            <Table.Column isRowHeader>Ticket</Table.Column>
            <Table.Column>Client</Table.Column>
            <Table.Column>Statut</Table.Column>
            <Table.Column>Total</Table.Column>
            <Table.Column>Date</Table.Column>
          </Table.Header>
          <Table.Body>
            {tickets.map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell>
                  <span className="text-sm font-mono font-medium text-foreground">{t.numeroTicket}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-muted">{t.nomClient || "—"}</span>
                </Table.Cell>
                <Table.Cell>
                  <Chip className={`text-xs ${CLASSES_STATUT[t.statut] ?? "bg-muted/10 text-muted"}`}>
                    {LIBELLE_STATUT[t.statut] ?? t.statut}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm font-semibold tabular-nums">{formatMontant(t.total)} F</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-xs text-muted">{formatDate(t.creeLe)}</span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
