"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { stockAPI } from "@/features/stock/apis/stock.api";
import type { IStockEmplacement } from "@/features/stock/types/stock.type";
import { ModalEntreeStock } from "@/features/stock/components/modal-entree-stock";
import { ModalCreerEmplacement } from "@/features/stock/components/modal-creer-emplacement";
import { ModalTransfertStock } from "@/features/stock/components/modal-transfert-stock";
import { Table, Chip, Card, Button } from "@heroui/react";
import { MapPin, ArrowDownToLine, ArrowRightLeft, Package, PackagePlus, Plus } from "lucide-react";

const LABELS_TYPE: Record<string, string> = {
  SIMPLE: "Standard", VARIANT: "Variantes", SERIALIZED: "Serialise", PERISHABLE: "Perissable",
};

export default function PageStock() {
  const { token } = useAuth();
  const { data: emplacements } = useEmplacementListQuery();
  const [stockDetail, setStockDetail] = useState<IStockEmplacement[] | null>(null);
  const [empSelectionne, setEmpSelectionne] = useState("");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalEmpOuvert, setModalEmpOuvert] = useState(false);
  const [modalTransfertOuvert, setModalTransfertOuvert] = useState(false);

  async function chargerStock(emplacementId: string) {
    if (!token) return;
    setEmpSelectionne(emplacementId);
    try {
      setStockDetail(await stockAPI.stockParEmplacement(token, emplacementId));
    } catch {
      setStockDetail([]);
    }
  }

  return (
    <>
      <Topbar titre="Gestion du stock" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Emplacements ({emplacements?.length ?? 0})
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" className="gap-1.5" onPress={() => setModalEmpOuvert(true)}>
              <Plus size={16} />
              Emplacement
            </Button>
            <Button
              variant="secondary"
              className="gap-1.5"
              onPress={() => setModalTransfertOuvert(true)}
              isDisabled={(emplacements?.length ?? 0) < 2}
              aria-label="Transferer entre emplacements"
            >
              <ArrowRightLeft size={16} />
              Transferer
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
                <Button
                  key={emp.id}
                  variant={actif ? "outline" : "ghost"}
                  className={`w-full justify-start gap-3 px-4 py-3 h-auto bg-surface ${
                    actif ? "border-accent shadow-sm" : "border-border hover:border-foreground/20"
                  }`}
                  onPress={() => chargerStock(emp.id)}
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
              );
            })}
          </div>

          {/* Detail stock */}
          <div className="lg:col-span-3">
            {!empSelectionne ? (
              <Card>
                <Card.Content className="py-20 text-center">
                  <ArrowDownToLine size={28} className="text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Selectionnez un emplacement</p>
                  <p className="text-xs text-neutral-400 mt-1">pour consulter le stock disponible</p>
                </Card.Content>
              </Card>
            ) : stockDetail === null ? (
              <Card><Card.Content className="py-12 text-center"><p className="text-sm text-neutral-400">Chargement...</p></Card.Content></Card>
            ) : stockDetail.length === 0 ? (
              <Card>
                <Card.Content className="py-16 text-center">
                  <Package size={28} className="text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Aucun stock dans cet emplacement</p>
                </Card.Content>
              </Card>
            ) : (
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Stock par emplacement">
                    <Table.Header>
                      <Table.Column isRowHeader>Produit</Table.Column>
                      <Table.Column>SKU</Table.Column>
                      <Table.Column>Type</Table.Column>
                      <Table.Column>Quantite</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {stockDetail.map((s) => (
                        <Table.Row key={s.varianteId}>
                          <Table.Cell>
                            <div>
                              <p className="text-sm font-medium text-neutral-800">{s.nomProduit}</p>
                              {s.nomVariante && <p className="text-xs text-neutral-500">{s.nomVariante}</p>}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-xs font-mono text-neutral-500">{s.sku}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip className="text-xs">{LABELS_TYPE[s.typeProduit] || s.typeProduit}</Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <span className={`text-sm font-semibold tabular-nums ${
                              s.quantite <= 0 ? "text-red-600" : s.quantite < 10 ? "text-amber-600" : "text-neutral-900"
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
      </div>

      <ModalEntreeStock
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
      />
      <ModalCreerEmplacement
        ouvert={modalEmpOuvert}
        onFermer={() => setModalEmpOuvert(false)}
      />
      <ModalTransfertStock
        ouvert={modalTransfertOuvert}
        onFermer={() => setModalTransfertOuvert(false)}
        emplacementSourceParDefaut={empSelectionne}
      />
    </>
  );
}
