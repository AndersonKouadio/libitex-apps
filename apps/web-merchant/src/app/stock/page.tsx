"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { ModalEntreeStock } from "@/features/stock/components/modal-entree-stock";
import { ModalTransfertStock } from "@/features/stock/components/modal-transfert-stock";
import { ModalAjustementStock } from "@/features/stock/components/modal-ajustement-stock";
import { ModalReceptionIngredient } from "@/features/ingredient/components/modal-reception-ingredient";
import { ModalAjustementIngredient } from "@/features/ingredient/components/modal-ajustement-ingredient";
import { ModalTransfertIngredient } from "@/features/ingredient/components/modal-transfert-ingredient";
import { KpisStock } from "@/features/stock/components/kpis-stock";
import { BandeauAlertesStock } from "@/features/stock/components/bandeau-alertes-stock";
import { TableStockVariantes } from "@/features/stock/components/table-stock-variantes";
import { KpisStockIngredients } from "@/features/ingredient/components/kpis-stock-ingredients";
import { TableStockIngredients } from "@/features/ingredient/components/table-stock-ingredients";
import {
  fusionnerStockIngredients, calculerKpisIngredients,
} from "@/features/ingredient/utils/calcul-kpi";
import { calculerKpisStock } from "@/features/stock/utils/calcul-kpi";
import {
  useIngredientListQuery, useStockIngredientsQuery,
} from "@/features/ingredient/queries/ingredient-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { Card, Button, Skeleton, Tabs } from "@heroui/react";
import {
  MapPin, ArrowDownToLine, ArrowRightLeft, Package, PackagePlus,
  Settings, Wheat, Scale, History,
} from "lucide-react";

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
  const [modalAjustIngOuvert, setModalAjustIngOuvert] = useState(false);
  const [modalTransfertIngOuvert, setModalTransfertIngOuvert] = useState(false);
  const [filtreAlerte, setFiltreAlerte] = useState(false);
  const [filtreAlerteIng, setFiltreAlerteIng] = useState(false);

  const { data: stockDetail, isLoading: chargementStock } =
    useStockEmplacementQuery(empSelectionne || undefined);
  const { data: ingredients } = useIngredientListQuery();
  const { data: stockIng } = useStockIngredientsQuery(empSelectionne || undefined);

  // Onglet Ingredients reserve aux secteurs concernes (Restauration ou Multi).
  const secteur = boutique?.secteurActivite;
  const ingredientsDisponible = secteur === "RESTAURATION" || secteur === "AUTRE";

  // KPIs calcules au vol sur les lignes chargees pour l'emplacement courant.
  const kpis = useMemo(() => calculerKpisStock(stockDetail ?? []), [stockDetail]);

  // Fusion fiche + stock + KPIs ingredients.
  const lignesIng = useMemo(
    () => fusionnerStockIngredients(ingredients ?? [], stockIng ?? []),
    [ingredients, stockIng],
  );
  const kpisIng = useMemo(() => calculerKpisIngredients(lignesIng), [lignesIng]);

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
            <Link href="/stock/mouvements">
              <Button variant="ghost" className="gap-1.5 text-xs">
                <History size={14} />
                Historique
              </Button>
            </Link>
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
              <>
                <Button
                  variant="secondary" className="gap-1.5"
                  onPress={() => setModalAjustIngOuvert(true)}
                  aria-label="Ajuster un ingrédient"
                >
                  <Scale size={16} />
                  Ajuster
                </Button>
                <Button
                  variant="secondary" className="gap-1.5"
                  onPress={() => setModalTransfertIngOuvert(true)}
                  isDisabled={(emplacements?.length ?? 0) < 2}
                  aria-label="Transférer un ingrédient"
                >
                  <ArrowRightLeft size={16} />
                  Transférer
                </Button>
                <Button variant="primary" className="gap-1.5" onPress={() => setModalReceptionOuvert(true)}>
                  <PackagePlus size={16} />
                  Réceptionner
                </Button>
              </>
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
                <div>
                  <KpisStock kpis={kpis} />
                  <BandeauAlertesStock
                    nbAlertes={kpis.nbAlertes}
                    nbRuptures={kpis.nbRuptures}
                    filtreActif={filtreAlerte}
                    onBasculerFiltre={() => setFiltreAlerte((v) => !v)}
                  />
                  <TableStockVariantes rows={stockDetail ?? []} filtreAlerte={filtreAlerte} />
                </div>
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
                <div>
                  <KpisStockIngredients kpis={kpisIng} />
                  <BandeauAlertesStock
                    nbAlertes={kpisIng.nbAlertes}
                    nbRuptures={kpisIng.nbRuptures}
                    filtreActif={filtreAlerteIng}
                    onBasculerFiltre={() => setFiltreAlerteIng((v) => !v)}
                  />
                  <TableStockIngredients lignes={lignesIng} filtreAlerte={filtreAlerteIng} />
                </div>
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
      <ModalAjustementIngredient
        ouvert={modalAjustIngOuvert}
        onFermer={() => setModalAjustIngOuvert(false)}
        emplacementParDefautId={empSelectionne}
      />
      <ModalTransfertIngredient
        ouvert={modalTransfertIngOuvert}
        onFermer={() => setModalTransfertIngOuvert(false)}
        emplacementSourceParDefaut={empSelectionne}
      />
    </PageContainer>
  );
}
