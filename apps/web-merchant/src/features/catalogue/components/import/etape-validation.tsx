"use client";

import { Table, Chip, ScrollShadow } from "@heroui/react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface LigneValidee {
  index: number;
  produit: { nom?: unknown; variantes?: Array<{ sku?: string; prixDetail?: number }> } & Record<string, unknown>;
  erreurs: string[];
}

interface Props {
  lignes: LigneValidee[];
}

const LIMITE_APERCU = 50;

export function EtapeValidation({ lignes }: Props) {
  const valides = lignes.filter((l) => l.erreurs.length === 0);
  const invalides = lignes.filter((l) => l.erreurs.length > 0);
  const apercu = lignes.slice(0, LIMITE_APERCU);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Chip className="text-xs bg-success/10 text-success gap-1">
          <CheckCircle2 size={12} />
          {valides.length} valide{valides.length > 1 ? "s" : ""}
        </Chip>
        {invalides.length > 0 && (
          <Chip className="text-xs bg-danger/10 text-danger gap-1">
            <XCircle size={12} />
            {invalides.length} en erreur
          </Chip>
        )}
        <span className="text-xs text-muted">
          {lignes.length > LIMITE_APERCU
            ? `Aperçu des ${LIMITE_APERCU} premières lignes sur ${lignes.length}`
            : `${lignes.length} ligne${lignes.length > 1 ? "s" : ""} au total`}
        </span>
      </div>

      <ScrollShadow className="max-h-[420px] rounded-lg border border-border">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Aperçu de l'import">
              <Table.Header className="table-header-libitex">
                <Table.Column className="w-12">#</Table.Column>
                <Table.Column>Nom</Table.Column>
                <Table.Column>SKU</Table.Column>
                <Table.Column>Prix détail</Table.Column>
                <Table.Column>Statut</Table.Column>
              </Table.Header>
              <Table.Body>
                {apercu.map((l) => {
                  const v = l.produit.variantes?.[0];
                  return (
                    <Table.Row key={l.index}>
                      <Table.Cell>
                        <span className="text-xs font-mono text-muted">{l.index + 1}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm text-foreground">{String(l.produit.nom ?? "—")}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-xs font-mono text-muted">{v?.sku || "—"}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm tabular-nums text-foreground">
                          {v?.prixDetail ? `${v.prixDetail.toLocaleString("fr-FR")} F` : "—"}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        {l.erreurs.length === 0 ? (
                          <Chip className="text-xs bg-success/10 text-success">OK</Chip>
                        ) : (
                          <span className="text-xs text-danger">{l.erreurs[0]}</span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </ScrollShadow>
    </div>
  );
}
