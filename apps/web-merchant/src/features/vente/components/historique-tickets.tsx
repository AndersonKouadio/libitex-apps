"use client";

import { useState } from "react";
import { Table, Button } from "@heroui/react";
import { RotateCcw } from "lucide-react";
import type { ITicket } from "../types/vente.type";
import { formatMontant, formatDate } from "../utils/format";
import { StatutChip, type VarianteStatut } from "@/components/statut-chip";
import { ModalRetour } from "./modal-retour";

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PARKED: "En attente",
  COMPLETE: "Complété",
  COMPLETED: "Complété",
  ANNULE: "Annulé",
  VOIDED: "Annulé",
  OPEN: "Ouvert",
  RETURN: "Retour",
};

const VARIANTE_STATUT: Record<string, VarianteStatut> = {
  EN_ATTENTE: "pending",
  PARKED: "pending",
  COMPLETE: "active",
  COMPLETED: "active",
  ANNULE: "failed",
  VOIDED: "failed",
  OPEN: "draft",
  RETURN: "failed",
};

interface Props {
  tickets: ITicket[];
}

export function HistoriqueTickets({ tickets }: Props) {
  const [ticketRetour, setTicketRetour] = useState<ITicket | null>(null);

  if (tickets.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border py-12 text-center">
        <p className="text-sm text-muted">Aucun ticket pour le moment</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Historique des tickets">
            <Table.Header className="table-header-libitex">
              <Table.Column isRowHeader>Ticket</Table.Column>
              <Table.Column>Type</Table.Column>
              <Table.Column>Client</Table.Column>
              <Table.Column>Statut</Table.Column>
              <Table.Column>Total</Table.Column>
              <Table.Column>Date</Table.Column>
              <Table.Column>Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {tickets.map((t) => (
                <Table.Row key={t.id}>
                  <Table.Cell>
                    <span className="text-sm font-mono font-medium text-foreground">{t.numeroTicket}</span>
                  </Table.Cell>
                  <Table.Cell>
                    {t.type === "RETURN" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                        <RotateCcw size={12} /> Retour
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Vente</span>
                    )}
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
                  <Table.Cell>
                    {t.statut === "COMPLETED" && t.type !== "RETURN" && (
                      <Button
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-xs text-muted hover:text-foreground"
                        onPress={() => setTicketRetour(t)}
                      >
                        <RotateCcw size={12} />
                        Retourner
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {ticketRetour && (
        <ModalRetour
          ouvert={true}
          onFermer={() => setTicketRetour(null)}
          ticket={ticketRetour}
        />
      )}
    </>
  );
}
