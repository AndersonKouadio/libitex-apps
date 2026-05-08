"use client";

import { useState } from "react";
import { Button, Table, Chip, Card, Skeleton } from "@heroui/react";
import { Plus, PackagePlus, Wheat, AlertTriangle, MapPin } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import {
  useIngredientListQuery,
  useStockIngredientsQuery,
} from "@/features/ingredient/queries/ingredient-list.query";
import { ModalCreerIngredient } from "@/features/ingredient/components/modal-creer-ingredient";
import { ModalReceptionIngredient } from "@/features/ingredient/components/modal-reception-ingredient";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";

export default function PageIngredients() {
  const { data: boutique } = useBoutiqueActiveQuery();
  const { data: emplacements } = useEmplacementListQuery();
  const { data: ingredients, isLoading } = useIngredientListQuery();

  const [empSelectionne, setEmpSelectionne] = useState("");
  const [modalCreerOuvert, setModalCreerOuvert] = useState(false);
  const [modalReceptionOuvert, setModalReceptionOuvert] = useState(false);

  const empActif = empSelectionne || emplacements?.[0]?.id || "";
  const { data: stocks } = useStockIngredientsQuery(empActif || undefined);

  const stockMap = new Map((stocks ?? []).map((s) => [s.ingredientId, s]));

  // Garde-fou : module ingrédients réservé aux secteurs concernés (restauration, etc.)
  const secteur = boutique?.secteurActivite;
  const moduleDisponible = secteur === "RESTAURATION" || secteur === "AUTRE";

  if (boutique && !moduleDisponible) {
    return (
      <>
        <Topbar titre="Ingrédients" />
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <Card.Content className="py-12 text-center">
              <Wheat size={32} className="text-muted/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                Module non disponible pour ce secteur
              </p>
              <p className="text-sm text-muted mt-1 max-w-md mx-auto">
                La gestion d'ingrédients et de recettes est réservée aux secteurs Restauration
                et Multi-activités. Modifiez le secteur de votre boutique pour y accéder.
              </p>
            </Card.Content>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar titre="Ingrédients & recettes" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div>
            <p className="text-sm text-muted max-w-2xl">
              Gérez les matières premières (farine, huile, viande...) en grammes ou litres.
              Les menus consomment automatiquement leurs ingrédients à chaque vente selon la recette définie.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" className="gap-1.5" onPress={() => setModalCreerOuvert(true)}>
              <Plus size={16} />
              Ingrédient
            </Button>
            <Button variant="primary" className="gap-1.5" onPress={() => setModalReceptionOuvert(true)}>
              <PackagePlus size={16} />
              Réceptionner
            </Button>
          </div>
        </div>

        {(emplacements?.length ?? 0) > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-medium text-muted">Stock à :</span>
            {(emplacements ?? []).map((e) => {
              const actif = empActif === e.id;
              return (
                <Button
                  key={e.id}
                  variant={actif ? "primary" : "ghost"}
                  className="gap-1.5 text-xs"
                  onPress={() => setEmpSelectionne(e.id)}
                >
                  <MapPin size={12} />
                  {e.nom}
                </Button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (ingredients ?? []).length === 0 ? (
          <Card>
            <Card.Content className="py-16 text-center">
              <Wheat size={32} className="text-muted/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Aucun ingrédient</p>
              <p className="text-sm text-muted mt-1 mb-4">
                Commencez par déclarer vos matières premières (farine, huile, viandes, légumes...)
              </p>
              <Button variant="primary" className="gap-1.5" onPress={() => setModalCreerOuvert(true)}>
                <Plus size={16} />
                Créer un ingrédient
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Ingrédients">
                <Table.Header className="table-header-libitex">
                  <Table.Column isRowHeader>Ingrédient</Table.Column>
                  <Table.Column>Unité</Table.Column>
                  <Table.Column>Stock actuel</Table.Column>
                  <Table.Column>Seuil alerte</Table.Column>
                  <Table.Column>Coût unitaire</Table.Column>
                </Table.Header>
                <Table.Body>
                  {(ingredients ?? []).map((i) => {
                    const stock = stockMap.get(i.id);
                    const enAlerte = stock?.enAlerte ?? false;
                    return (
                      <Table.Row key={i.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                              <Wheat size={14} />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{i.nom}</p>
                              {i.description && (
                                <p className="text-xs text-muted truncate max-w-xs">{i.description}</p>
                              )}
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip className="text-xs">{UNITE_LABELS[i.unite]}</Chip>
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
                          <span className="text-sm font-medium tabular-nums">
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
        )}
      </div>

      <ModalCreerIngredient ouvert={modalCreerOuvert} onFermer={() => setModalCreerOuvert(false)} />
      <ModalReceptionIngredient ouvert={modalReceptionOuvert} onFermer={() => setModalReceptionOuvert(false)} />
    </>
  );
}
