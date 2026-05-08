"use client";

import { Table } from "@heroui/react";
import type { ITicket } from "../types/vente.type";
import { formatMontant, formatDate } from "../utils/format";
import { StatutChip, type VarianteStatut } from "@/components/statut-chip";

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PARKED: "En attente",
  COMPLETE: "Complete",
  COMPLETED: "Complete",
  ANNULE: "Annulé",
  VOIDED: "Annulé",
  OPEN: "Ouvert",
};

const VARIANTE_STATUT: Record<string, VarianteStatut> = {
  EN_ATTENTE: "pending",
  PARKED: "pending",
  COMPLETE: "active",
  COMPLETED: "active",
  ANNULE: "failed",
  VOIDED: "failed",
  OPEN: "draft",
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
          <Table.Header className="table-header-libitex">
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
                  <StatutChip variante={VARIANTE_STATUT[t.statut] ?? "draft"}>
                    {LIBELLE_STATUT[t.statut] ?? t.statut}
                  </StatutChip>
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
