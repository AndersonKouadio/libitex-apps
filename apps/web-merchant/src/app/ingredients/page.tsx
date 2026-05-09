"use client";

import { useState } from "react";
import { Button, Table, Chip, Card, Skeleton } from "@heroui/react";
import { Plus, Wheat, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { NavCatalogue } from "@/components/layout/nav-catalogue";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useIngredientListQuery } from "@/features/ingredient/queries/ingredient-list.query";
import { useSupprimerIngredientMutation } from "@/features/ingredient/queries/ingredient-mutations";
import { ModalIngredient } from "@/features/ingredient/components/modal-ingredient";
import type { IIngredient } from "@/features/ingredient/types/ingredient.type";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";
import { useConfirmation } from "@/providers/confirmation-provider";

/**
 * Page Catalogue / Ingredients : fiche pure (nom, unite de base, cout, seuil
 * d'alerte). La gestion du stock (reception, ajustement, vue par emplacement)
 * a deplace dans /stock onglet "Ingredients" pour separer clairement le
 * "quoi" (catalogue) du "combien" (stock).
 */
export default function PageIngredients() {
  const { data: boutique } = useBoutiqueActiveQuery();
  const { data: ingredients, isLoading } = useIngredientListQuery();
  const supprimer = useSupprimerIngredientMutation();
  const confirmer = useConfirmation();

  const [modalIngredientOuvert, setModalIngredientOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<IIngredient | null>(null);

  function ouvrirCreation() {
    setEnEdition(null);
    setModalIngredientOuvert(true);
  }

  function ouvrirEdition(i: IIngredient) {
    setEnEdition(i);
    setModalIngredientOuvert(true);
  }

  async function handleSupprimer(i: IIngredient) {
    const ok = await confirmer({
      titre: "Supprimer cet ingrédient ?",
      description: `L'ingrédient « ${i.nom} » sera supprimé. Les recettes des menus qui l'utilisent doivent être mises à jour.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(i.id);
  }

  // Garde-fou : module ingrédients réservé aux secteurs concernés (restauration, etc.)
  const secteur = boutique?.secteurActivite;
  const moduleDisponible = secteur === "RESTAURATION" || secteur === "AUTRE";

  if (boutique && !moduleDisponible) {
    return (
      <PageContainer>
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
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <NavCatalogue />
      <PageHeader
        titre={`${(ingredients ?? []).length} ingrédient${(ingredients ?? []).length > 1 ? "s" : ""}`}
        description="Définissez vos matières premières (nom, unité, coût, seuil). Le stock par emplacement se gère dans Stock."
        actions={
          <>
            <Link href="/stock">
              <Button variant="ghost" className="gap-1.5 text-xs">
                <ArrowUpRight size={14} />
                Voir le stock
              </Button>
            </Link>
            <Button variant="primary" className="gap-1.5" onPress={() => ouvrirCreation()}>
              <Plus size={16} />
              Ingrédient
            </Button>
          </>
        }
      />

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
            <Button variant="primary" className="gap-1.5" onPress={() => ouvrirCreation()}>
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
                <Table.Column>Unité de base</Table.Column>
                <Table.Column>Seuil d'alerte</Table.Column>
                <Table.Column>Coût unitaire</Table.Column>
                <Table.Column className="w-20"> </Table.Column>
              </Table.Header>
              <Table.Body>
                {(ingredients ?? []).map((i) => (
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
                    <Table.Cell>
                      <div className="flex items-center gap-0.5 justify-end">
                        <Button
                          variant="ghost"
                          className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                          aria-label={`Modifier ${i.nom}`}
                          onPress={() => ouvrirEdition(i)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                          aria-label={`Supprimer ${i.nom}`}
                          onPress={() => handleSupprimer(i)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <ModalIngredient
        ouvert={modalIngredientOuvert}
        ingredient={enEdition}
        onFermer={() => setModalIngredientOuvert(false)}
      />
    </PageContainer>
  );
}
