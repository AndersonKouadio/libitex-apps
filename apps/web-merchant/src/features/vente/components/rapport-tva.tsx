"use client";

import { Card, Table, Chip } from "@heroui/react";
import { ClipboardList } from "lucide-react";
import type { IRapportTva } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  rapport: IRapportTva;
}

/**
 * Tableau TVA pour la declaration fiscale (DGI en CI : taux normal 18%).
 * Une ligne par taux distinct, avec base HT, TVA collectee et total TTC.
 */
export function RapportTva({ rapport }: Props) {
  if (rapport.taux.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">TVA du {rapport.debut} au {rapport.fin}</Card.Title>
        </Card.Header>
        <Card.Content className="py-10 text-center">
          <ClipboardList size={20} className="text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">Aucune vente sur la période</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <ClipboardList size={14} className="text-accent" />
          TVA collectée du {rapport.debut} au {rapport.fin}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="TVA par taux">
              <Table.Header className="table-header-libitex">
                <Table.Column isRowHeader>Taux</Table.Column>
                <Table.Column>Base HT</Table.Column>
                <Table.Column>TVA collectée</Table.Column>
                <Table.Column>Total TTC</Table.Column>
                <Table.Column>Lignes</Table.Column>
              </Table.Header>
              <Table.Body>
                {rapport.taux.map((t) => (
                  <Table.Row key={t.taux}>
                    <Table.Cell>
                      {t.taux === 0 ? (
                        <Chip className="text-xs bg-muted/10 text-muted">Exonéré</Chip>
                      ) : (
                        <Chip className="text-xs bg-accent/10 text-accent">{t.taux}%</Chip>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatMontant(t.baseHt)} <span className="text-xs font-normal text-muted">F</span>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm tabular-nums text-foreground">
                        {t.tva > 0 ? `${formatMontant(t.tva)} F` : "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm tabular-nums text-muted">
                        {formatMontant(t.totalTtc)} F
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs tabular-nums text-muted">{t.nombreLignes}</span>
                    </Table.Cell>
                  </Table.Row>
                ))}
                <Table.Row className="border-t border-border bg-surface-secondary/30">
                  <Table.Cell>
                    <span className="text-sm font-semibold">Total</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMontant(rapport.totaux.baseHt)} <span className="text-xs font-normal text-muted">F</span>
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums text-accent">
                      {formatMontant(rapport.totaux.tva)} F
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMontant(rapport.totaux.totalTtc)} F
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs tabular-nums">{rapport.totaux.nombreLignes}</span>
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
