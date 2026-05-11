"use client";

import { Card, Table } from "@heroui/react";
import { TrendingUp } from "lucide-react";
import type { IRapportVentesPeriode } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  rapport: IRapportVentesPeriode;
}

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short", day: "2-digit", month: "2-digit",
});

export function RapportVentesPeriode({ rapport }: Props) {
  if (rapport.jours.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Ventes du {rapport.debut} au {rapport.fin}</Card.Title>
        </Card.Header>
        <Card.Content className="py-10 text-center">
          <TrendingUp size={20} className="text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">Aucune vente sur la période</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <TrendingUp size={14} className="text-accent" />
          Ventes du {rapport.debut} au {rapport.fin}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Ventes par jour">
              <Table.Header className="table-header-libitex">
                <Table.Column isRowHeader>Date</Table.Column>
                <Table.Column>Tickets</Table.Column>
                <Table.Column>Recettes</Table.Column>
                <Table.Column>Ticket moyen</Table.Column>
                <Table.Column>TVA</Table.Column>
                <Table.Column>Remises</Table.Column>
              </Table.Header>
              <Table.Body>
                {rapport.jours.map((j) => (
                  <Table.Row key={j.date}>
                    <Table.Cell>
                      <span className="text-sm capitalize">
                        {FORMAT_JOUR.format(new Date(j.date)).replace(".", "")}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm tabular-nums">{j.nombre}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatMontant(j.recettes)} <span className="text-xs font-normal text-muted">F</span>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm tabular-nums text-muted">
                        {formatMontant(j.ticketMoyen)} F
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs tabular-nums text-muted">
                        {j.tva > 0 ? `${formatMontant(j.tva)} F` : "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs tabular-nums text-muted">
                        {j.remises > 0 ? `${formatMontant(j.remises)} F` : "—"}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
                <Table.Row className="border-t border-border bg-surface-secondary/30">
                  <Table.Cell>
                    <span className="text-sm font-semibold">Total</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">{rapport.totaux.tickets}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMontant(rapport.totaux.recettes)} <span className="text-xs font-normal text-muted">F</span>
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMontant(rapport.totaux.ticketMoyen)} F
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs tabular-nums">
                      {formatMontant(rapport.totaux.tva)} F
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs tabular-nums">
                      {formatMontant(rapport.totaux.remises)} F
                    </span>
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}
