"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { useSupprimerEmplacementMutation } from "@/features/stock/queries/emplacement.mutations";
import { ModalEntreeStock } from "@/features/stock/components/modal-entree-stock";
import { ModalEmplacement } from "@/features/stock/components/modal-emplacement";
import { ModalTransfertStock } from "@/features/stock/components/modal-transfert-stock";
import type { IEmplacement } from "@/features/stock/types/stock.type";
import { useConfirmation } from "@/providers/confirmation-provider";
import { Table, Chip, Card, Button, Skeleton } from "@heroui/react";
import {
  MapPin, ArrowDownToLine, ArrowRightLeft, Package, PackagePlus, Plus,
  Pencil, Trash2,
} from "lucide-react";

const LABELS_TYPE: Record<string, string> = {
  SIMPLE: "Standard", VARIANT: "Variantes", SERIALIZED: "Sérialisé", PERISHABLE: "Périssable",
};

export default function PageStock() {
  const { data: emplacements, isLoading: chargementEmpList } = useEmplacementListQuery();
  const supprimer = useSupprimerEmplacementMutation();
  const confirmer = useConfirmation();
  const [empSelectionne, setEmpSelectionne] = useState("");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalEmpOuvert, setModalEmpOuvert] = useState(false);
  const [empEnEdition, setEmpEnEdition] = useState<IEmplacement | null>(null);
  const [modalTransfertOuvert, setModalTransfertOuvert] = useState(false);

  const { data: stockDetail, isLoading: chargementStock } = useStockEmplacementQuery(empSelectionne || undefined);

  function ouvrirCreation() {
    setEmpEnEdition(null);
    setModalEmpOuvert(true);
  }

  function ouvrirEdition(emp: IEmplacement) {
    setEmpEnEdition(emp);
    setModalEmpOuvert(true);
  }

  async function supprimerEmplacement(emp: IEmplacement) {
    const ok = await confirmer({
      titre: "Supprimer cet emplacement ?",
      description: `L'emplacement « ${emp.nom} » sera supprimé. Cette action échoue s'il contient encore du stock.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    try {
      await supprimer.mutateAsync(emp.id);
      if (empSelectionne === emp.id) setEmpSelectionne("");
    } catch {
      // toast deja affiche par la mutation
    }
  }

  return (
    <PageContainer>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Emplacements {chargementEmpList ? "..." : `(${emplacements?.length ?? 0})`}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" className="gap-1.5" onPress={ouvrirCreation}>
              <Plus size={16} />
              Emplacement
            </Button>
            <Button
              variant="secondary"
              className="gap-1.5"
              onPress={() => setModalTransfertOuvert(true)}
              isDisabled={(emplacements?.length ?? 0) < 2}
              aria-label="Transférer entre emplacements"
            >
              <ArrowRightLeft size={16} />
              Transférer
            </Button>
            <Button variant="primary" className="gap-1.5" onPress={() => setModalOuvert(true)}>
              <PackagePlus size={16} />
              Recevoir du stock
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {(emplacements ?? []).map((emp) => {
              const actif = empSelectionne === emp.id;
              return (
                <div
                  key={emp.id}
                  className={`flex items-center gap-1 rounded-lg border bg-surface group ${
                    actif ? "border-accent shadow-sm" : "border-border hover:border-foreground/20"
                  }`}
                >
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start gap-3 px-3 py-3 h-auto rounded-l-lg rounded-r-none"
                    onPress={() => setEmpSelectionne(emp.id)}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      actif ? "bg-accent/10 text-accent" : "bg-surface-secondary text-muted"
                    }`}>
                      <MapPin size={16} />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-sm font-medium text-foreground truncate">{emp.nom}</span>
                      <span className="block text-xs text-muted capitalize">{emp.type.toLowerCase()}</span>
                    </span>
                  </Button>
                  <div className="flex items-center pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                      onPress={() => ouvrirEdition(emp)}
                      aria-label={`Modifier ${emp.nom}`}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                      onPress={() => supprimerEmplacement(emp)}
                      aria-label={`Supprimer ${emp.nom}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-3">
            {!empSelectionne ? (
              <Card>
                <Card.Content className="py-20 text-center">
                  <ArrowDownToLine size={28} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-foreground">Sélectionnez un emplacement</p>
                  <p className="text-xs text-muted mt-1">pour consulter le stock disponible</p>
                </Card.Content>
              </Card>
            ) : chargementStock ? (
              <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-4 w-20 rounded ml-auto" />
                  </div>
                ))}
              </div>
            ) : (stockDetail ?? []).length === 0 ? (
              <Card>
                <Card.Content className="py-16 text-center">
                  <Package size={28} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-foreground">Aucun stock dans cet emplacement</p>
                  <p className="text-xs text-muted mt-1">Cliquez sur « Recevoir du stock » pour réceptionner de la marchandise</p>
                </Card.Content>
              </Card>
            ) : (
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Stock par emplacement">
                    <Table.Header className="table-header-libitex">
                      <Table.Column isRowHeader>Produit</Table.Column>
                      <Table.Column>SKU</Table.Column>
                      <Table.Column>Type</Table.Column>
                      <Table.Column>Quantité</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {(stockDetail ?? []).map((s) => (
                        <Table.Row key={s.varianteId}>
                          <Table.Cell>
                            <div>
                              <p className="text-sm font-medium text-foreground">{s.nomProduit}</p>
                              {s.nomVariante && <p className="text-xs text-muted">{s.nomVariante}</p>}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-xs font-mono text-muted">{s.sku}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip className="text-xs">{LABELS_TYPE[s.typeProduit] || s.typeProduit}</Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <span className={`text-sm font-semibold tabular-nums ${
                              s.quantite <= 0 ? "text-danger" : s.quantite < 10 ? "text-warning" : "text-foreground"
                            }`}>
                              {s.quantite}
                            </span>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </div>
        </div>

      <ModalEntreeStock ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} />
      <ModalEmplacement
        ouvert={modalEmpOuvert}
        emplacement={empEnEdition}
        onFermer={() => setModalEmpOuvert(false)}
      />
      <ModalTransfertStock
        ouvert={modalTransfertOuvert}
        onFermer={() => setModalTransfertOuvert(false)}
        emplacementSourceParDefaut={empSelectionne}
      />
    </PageContainer>
  );
}
