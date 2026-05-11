"use client";

import { Card, Table, Chip } from "@heroui/react";
import { Calculator, AlertTriangle } from "lucide-react";
import type { IRapportMarges } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  rapport: IRapportMarges;
}

/**
 * Tableau des marges par produit. Si le prix d'achat est manquant (0),
 * la ligne est marquee avec un Chip d'alerte et la marge brute affichee
 * vaut le CA (donnee non significative).
 */
export function RapportMarges({ rapport }: Props) {
  if (rapport.lignes.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Marges du {rapport.debut} au {rapport.fin}</Card.Title>
        </Card.Header>
        <Card.Content className="py-10 text-center">
          <Calculator size={20} className="text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">Aucune vente sur la période</p>
        </Card.Content>
      </Card>
    );
  }

  const ligneAvecPrixManquants = rapport.lignes.some((l) => l.prixAchatManquant);

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <Calculator size={14} className="text-accent" />
          Marges du {rapport.debut} au {rapport.fin}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        {ligneAvecPrixManquants && (
          <div className="px-4 py-2.5 bg-warning/10 text-warning text-xs flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>
              Certains produits n'ont pas de prix d'achat saisi : leur marge n'est pas significative.
              Renseignez le prix d'achat dans la fiche produit pour obtenir une vraie marge brute.
            </span>
          </div>
        )}
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Marges par produit">
              <Table.Header className="table-header-libitex">
                <Table.Column isRowHeader>Produit</Table.Column>
                <Table.Column>Qté</Table.Column>
                <Table.Column>CA</Table.Column>
                <Table.Column>Coût</Table.Column>
                <Table.Column>Marge brute</Table.Column>
                <Table.Column>Marge %</Table.Column>
              </Table.Header>
              <Table.Body>
                {rapport.lignes.map((l) => {
                  const margePositive = l.margeBrute > 0;
                  return (
                    <Table.Row key={l.variantId}>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{l.nomProduit}</p>
                            <p className="text-xs font-mono text-muted">{l.sku}</p>
                          </div>
                          {l.prixAchatManquant && (
                            <Chip className="text-[10px] gap-1 bg-warning/10 text-warning">
                              <AlertTriangle size={9} /> Prix manquant
                            </Chip>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm tabular-nums">{l.quantiteTotale}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMontant(l.chiffreAffaires)} <span className="text-xs font-normal text-muted">F</span>
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm tabular-nums text-muted">
                          {l.prixAchatManquant ? "—" : `${formatMontant(l.coutTotal)} F`}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        {l.prixAchatManquant ? (
                          <span className="text-sm tabular-nums text-muted">—</span>
                        ) : (
                          <span className={`text-sm font-semibold tabular-nums ${
                            margePositive ? "text-success" : l.margeBrute < 0 ? "text-danger" : ""
                          }`}>
                            {formatMontant(l.margeBrute)} F
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {l.prixAchatManquant ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <span className={`text-sm font-semibold tabular-nums ${
                            l.margePourcent > 0 ? "text-success" : l.margePourcent < 0 ? "text-danger" : "text-muted"
                          }`}>
                            {l.margePourcent.toFixed(1)}%
                          </span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
                <Table.Row className="border-t border-border bg-surface-secondary/30">
                  <Table.Cell>
                    <span className="text-sm font-semibold">Total</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">{rapport.totaux.quantiteTotale}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMontant(rapport.totaux.chiffreAffaires)} <span className="text-xs font-normal text-muted">F</span>
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-semibold tabular-nums text-muted">
                      {formatMontant(rapport.totaux.coutTotal)} F
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`text-sm font-semibold tabular-nums ${
                      rapport.totaux.margeBrute > 0 ? "text-success" : rapport.totaux.margeBrute < 0 ? "text-danger" : ""
                    }`}>
                      {formatMontant(rapport.totaux.margeBrute)} F
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`text-sm font-semibold tabular-nums ${
                      rapport.totaux.margePourcent > 0 ? "text-success" : "text-muted"
                    }`}>
                      {rapport.totaux.margePourcent.toFixed(1)}%
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
