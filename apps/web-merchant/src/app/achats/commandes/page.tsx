"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button, Chip, Select, ListBox, Label, Skeleton, Card, Table,
} from "@heroui/react";
import { Plus, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useCommandeListQuery } from "@/features/achat/queries/achat.query";
import { formatMontant } from "@/features/vente/utils/format";
import type { StatutCommande } from "@/features/achat/types/achat.type";

const LIBELLE_STATUT: Record<StatutCommande, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyee",
  PARTIAL: "Partielle",
  RECEIVED: "Recue",
  CANCELLED: "Annulee",
};

const CLASSES_STATUT: Record<StatutCommande, string> = {
  DRAFT: "bg-muted/10 text-muted",
  SENT: "bg-accent/10 text-accent",
  PARTIAL: "bg-warning/10 text-warning",
  RECEIVED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

export default function PageCommandes() {
  const [statut, setStatut] = useState<string>("");
  const { data: commandes, isLoading } = useCommandeListQuery(
    statut ? { statut } : undefined,
  );

  return (
    <PageContainer>
      <PageHeader
        titre="Bons de commande"
        description="Suivi des commandes fournisseurs — reception alimente le stock automatiquement."
        actions={
          <Link href="/achats/commandes/nouvelle">
            <Button variant="primary" className="gap-2">
              <Plus size={16} />
              Nouvelle commande
            </Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Select
          selectedKey={statut || "all"}
          onSelectionChange={(k) => setStatut(k === "all" ? "" : String(k))}
          aria-label="Filtrer par statut"
          className="max-w-xs"
        >
          <Label>Statut</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="Tous">Tous les statuts</ListBox.Item>
              <ListBox.Item id="DRAFT" textValue="Brouillon">Brouillon</ListBox.Item>
              <ListBox.Item id="SENT" textValue="Envoyee">Envoyee</ListBox.Item>
              <ListBox.Item id="PARTIAL" textValue="Partielle">Partielle</ListBox.Item>
              <ListBox.Item id="RECEIVED" textValue="Recue">Recue</ListBox.Item>
              <ListBox.Item id="CANCELLED" textValue="Annulee">Annulee</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : (commandes?.length ?? 0) === 0 ? (
        <Card>
          <Card.Content className="p-10 text-center">
            <ClipboardList size={32} className="mx-auto mb-3 text-muted opacity-50" />
            <p className="text-sm text-foreground font-medium">Aucune commande</p>
            <p className="text-xs text-muted mt-1">
              Creez votre premier bon de commande pour reapprovisionner votre stock.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Liste des commandes">
                <Table.Header className="table-header-libitex">
                  <Table.Column isRowHeader>Numero</Table.Column>
                  <Table.Column>Fournisseur</Table.Column>
                  <Table.Column>Statut</Table.Column>
                  <Table.Column className="text-right">Total</Table.Column>
                  <Table.Column>Date</Table.Column>
                </Table.Header>
                <Table.Body>
                  {(commandes ?? []).map((c) => (
                    <Table.Row
                      key={c.id}
                      href={`/achats/commandes/${c.id}`}
                      className="cursor-pointer hover:bg-surface-secondary"
                    >
                      <Table.Cell className="font-mono text-xs">{c.numero}</Table.Cell>
                      <Table.Cell className="font-medium">{c.nomFournisseur}</Table.Cell>
                      <Table.Cell>
                        <Chip variant="soft" size="sm" className={CLASSES_STATUT[c.statut]}>
                          {LIBELLE_STATUT[c.statut]}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-right tabular-nums">
                        {formatMontant(c.montantTotal)} F
                      </Table.Cell>
                      <Table.Cell className="text-xs text-muted">
                        {new Date(c.creeLe).toLocaleDateString("fr-FR")}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
}
