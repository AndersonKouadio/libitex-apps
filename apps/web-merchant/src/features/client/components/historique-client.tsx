"use client";

import { useState } from "react";
import { Card, Table, Skeleton, Pagination, Button } from "@heroui/react";
import { Receipt, ArrowRight } from "lucide-react";
import { useHistoriqueClientQuery } from "../queries/client.query";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  clientId: string;
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

const PAGE_SIZE = 25;

export function HistoriqueClient({ clientId }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistoriqueClientQuery(clientId, page, PAGE_SIZE);
  const lignes = data?.data ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Historique d'achats</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
        </Card.Content>
      </Card>
    );
  }

  if (lignes.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Historique d'achats</Card.Title>
        </Card.Header>
        <Card.Content className="py-10 text-center">
          <Receipt size={20} className="text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">Aucun achat enregistré pour ce client</p>
          <p className="text-xs text-muted/70 mt-1">
            Les achats faits au POS avec ce client sélectionné apparaîtront ici.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm">
          Historique d'achats <span className="text-xs font-normal text-muted ml-1">· {total} ticket{total > 1 ? "s" : ""}</span>
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Historique des achats">
              <Table.Header className="table-header-libitex">
                <Table.Column isRowHeader>Date</Table.Column>
                <Table.Column>N° ticket</Table.Column>
                <Table.Column>Total</Table.Column>
              </Table.Header>
              <Table.Body>
                {lignes.map((l) => (
                  <Table.Row key={l.id}>
                    <Table.Cell>
                      <span className="text-sm text-muted tabular-nums">
                        {l.completeLe ? FORMAT_DATE.format(new Date(l.completeLe)) : "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs font-mono text-muted">{l.numeroTicket}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatMontant(l.total)}
                        <span className="text-xs font-normal text-muted ml-1">F</span>
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {totalPages > 1 && (
          <div className="p-3 border-t border-border">
            <PaginationBar page={page} total={totalPages} onChange={setPage} />
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function PaginationBar({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const debut = Math.max(1, page - 2);
  const fin = Math.min(total, debut + 4);
  const pages: number[] = [];
  for (let i = debut; i <= fin; i++) pages.push(i);
  return (
    <Pagination className="justify-center">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous isDisabled={page === 1} onPress={() => onChange(page - 1)}>
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        {pages.map((p) => (
          <Pagination.Item key={p}>
            <Pagination.Link isActive={p === page} onPress={() => onChange(p)}>
              {p}
            </Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item>
          <Pagination.Next isDisabled={page === total} onPress={() => onChange(page + 1)}>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
