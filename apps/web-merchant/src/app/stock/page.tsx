"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { ModalEntreeStock } from "@/features/stock/components/modal-entree-stock";
import { ModalTransfertStock } from "@/features/stock/components/modal-transfert-stock";
import { ModalAjustementStock } from "@/features/stock/components/modal-ajustement-stock";
import { ModalReceptionIngredient } from "@/features/ingredient/components/modal-reception-ingredient";
import {
  useIngredientListQuery, useStockIngredientsQuery,
} from "@/features/ingredient/queries/ingredient-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";
import { Table, Chip, Card, Button, Skeleton, Tabs } from "@heroui/react";
import {
  MapPin, ArrowDownToLine, ArrowRightLeft, Package, PackagePlus,
  Settings, Wheat, AlertTriangle, Scale,
} from "lucide-react";

const LABELS_TYPE: Record<string, string> = {
  SIMPLE: "Standard", VARIANT: "Variantes", SERIALIZED: "Sérialisé", PERISHABLE: "Périssable",
};

type Onglet = "variantes" | "ingredients";

export default function PageStock() {
  const { data: boutique } = useBoutiqueActiveQuery();
  const { data: emplacements, isLoading: chargementEmpList } = useEmplacementListQuery();
  const [empSelectionne, setEmpSelectionne] = useState("");
  const [onglet, setOnglet] = useState<Onglet>("variantes");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalTransfertOuvert, setModalTransfertOuvert] = useState(false);
  const [modalAjustementOuvert, setModalAjustementOuvert] = useState(false);
  const [modalReceptionOuvert, setModalReceptionOuvert] = useState(false);

  const { data: stockDetail, isLoading: chargementStock } =
    useStockEmplacementQuery(empSelectionne || undefined);
  const { data: ingredients } = useIngredientListQuery();
  const { data: stockIng } = useStockIngredientsQuery(empSelectionne || undefined);

  // Onglet Ingredients reserve aux secteurs concernes (Restauration ou Multi).
  const secteur = boutique?.secteurActivite;
  const ingredientsDisponible = secteur === "RESTAURATION" || secteur === "AUTRE";

  // Index stock ingredient par ingredientId pour lookup rapide.
  const stockIngMap = new Map((stockIng ?? []).map((s) => [s.ingredientId, s]));

  return (
    <PageContainer>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <Tabs selectedKey={onglet} onSelectionChange={(k) => setOnglet(k as Onglet)} aria-label="Type de stock">
            <Tabs.List>
              <Tabs.Tab id="variantes" className="px-4 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <Package size={14} />
                  Produits
                </span>
              </Tabs.Tab>
              {ingredientsDisponible && (
                <Tabs.Tab id="ingredients" className="px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Wheat size={14} />
                    Ingrédients
                  </span>
                </Tabs.Tab>
              )}
            </Tabs.List>
          </Tabs>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/parametres/emplacements">
              <Button variant="ghost" className="gap-1.5 text-xs">
                <Settings size={14} />
                Emplacements
              </Button>
            </Link>
            {onglet === "variantes" && (
              <>
                <Button
                  variant="secondary"
                  className="gap-1.5"
                  onPress={() => setModalAjustementOuvert(true)}
                  aria-label="Ajuster un inventaire"
                >
                  <Scale size={16} />
                  Ajuster
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
              </>
            )}
            {onglet === "ingredients" && (
              <Button variant="primary" className="gap-1.5" onPress={() => setModalReceptionOuvert(true)}>
                <PackagePlus size={16} />
                Réceptionner ingrédient
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {(emplacements ?? []).map((emp) => {
              const actif = empSelectionne === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setEmpSelectionne(emp.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border bg-surface text-left transition-colors ${
                    actif ? "border-accent shadow-sm" : "border-border hover:border-foreground/20"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    actif ? "bg-accent/10 text-accent" : "bg-surface-secondary text-muted"
                  }`}>
                    <MapPin size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{emp.nom}</span>
                    <span className="block text-xs text-muted capitalize">{emp.type.toLowerCase()}</span>
                  </span>
                </button>
              );
            })}
            {(emplacements ?? []).length === 0 && !chargementEmpList && (
              <Card>
                <Card.Content className="py-6 text-center">
                  <MapPin size={20} className="text-muted/30 mx-auto mb-2" />
                  <p className="text-xs text-muted mb-3">Aucun emplacement</p>
                  <Link href="/parametres/emplacements">
                    <Button variant="primary" className="text-xs gap-1.5">
                      <Settings size={12} />
                      Gérer
                    </Button>
                  </Link>
                </Card.Content>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3">
            {!empSelectionne ? (
              <Card>
                <Card.Content className="py-20 text-center">
                  <ArrowDownToLine size={28} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-foreground">Sélectionnez un emplacement</p>
                  <p className="text-xs text-muted mt-1">
                    pour consulter le stock {onglet === "variantes" ? "des produits" : "des ingrédients"}
                  </p>
                </Card.Content>
              </Card>
            ) : onglet === "variantes" ? (
              chargementStock ? (
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
              )
            ) : (
              // Onglet Ingredients : stock + seuil + alerte
              (ingredients ?? []).length === 0 ? (
                <Card>
                  <Card.Content className="py-16 text-center">
                    <Wheat size={28} className="text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-foreground">Aucun ingrédient déclaré</p>
                    <p className="text-xs text-muted mt-1 mb-3">
                      Déclarez d'abord vos ingrédients (farine, huile, viandes...) dans le catalogue.
                    </p>
                    <Link href="/ingredients">
                      <Button variant="primary" className="text-xs gap-1.5">
                        <ArrowDownToLine size={12} className="rotate-180" />
                        Aller au catalogue ingrédients
                      </Button>
                    </Link>
                  </Card.Content>
                </Card>
              ) : (
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Stock ingrédients par emplacement">
                      <Table.Header className="table-header-libitex">
                        <Table.Column isRowHeader>Ingrédient</Table.Column>
                        <Table.Column>Stock actuel</Table.Column>
                        <Table.Column>Seuil d'alerte</Table.Column>
                        <Table.Column>Coût unitaire</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {(ingredients ?? []).map((i) => {
                          const stock = stockIngMap.get(i.id);
                          const enAlerte = stock?.enAlerte ?? false;
                          return (
                            <Table.Row key={i.id}>
                              <Table.Cell>
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                                    <Wheat size={12} />
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{i.nom}</p>
                                    <p className="text-[10px] text-muted">en {UNITE_LABELS[i.unite]}</p>
                                  </div>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <span className={`text-sm font-semibold tabular-nums flex items-center gap-1 ${
                                  enAlerte ? "text-warning" : "text-foreground"
                                }`}>
                                  {enAlerte && <AlertTriangle size={12} />}
                                  {stock?.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) ?? "0"}
                                  <span className="text-[10px] font-normal text-muted ml-0.5">
                                    {UNITE_LABELS[i.unite]}
                                  </span>
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <span className="text-xs text-muted tabular-nums">
                                  {i.seuilAlerte > 0 ? `${i.seuilAlerte} ${UNITE_LABELS[i.unite]}` : "—"}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <span className="text-xs text-muted tabular-nums">
                                  {i.prixUnitaire > 0
                                    ? `${i.prixUnitaire.toLocaleString("fr-FR")} F / ${UNITE_LABELS[i.unite]}`
                                    : "—"}
                                </span>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )
            )}
          </div>
        </div>

      <ModalEntreeStock ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} />
      <ModalTransfertStock
        ouvert={modalTransfertOuvert}
        onFermer={() => setModalTransfertOuvert(false)}
        emplacementSourceParDefaut={empSelectionne}
      />
      <ModalAjustementStock
        ouvert={modalAjustementOuvert}
        onFermer={() => setModalAjustementOuvert(false)}
        emplacementParDefautId={empSelectionne}
      />
      <ModalReceptionIngredient
        ouvert={modalReceptionOuvert}
        onFermer={() => setModalReceptionOuvert(false)}
      />
    </PageContainer>
  );
}
