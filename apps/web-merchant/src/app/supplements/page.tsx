"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { NavCatalogue } from "@/components/layout/nav-catalogue";
import {
  Button, Skeleton, Chip, Table, Select, ListBox,
} from "@heroui/react";
import { Plus, Pencil, Trash2, UtensilsCrossed, Package } from "lucide-react";
import {
  useSupplementListQuery, useSupprimerSupplementMutation,
} from "@/features/supplement/queries/supplement.query";
import { ModalSupplement } from "@/features/supplement/components/modal-supplement";
import {
  CATEGORIES_SUPPLEMENT, LABELS_CATEGORIE_SUPPLEMENT, type ISupplement,
} from "@/features/supplement/types/supplement.type";
import { formatMontant } from "@/features/vente/utils/format";
import { useConfirmation } from "@/providers/confirmation-provider";

const COULEURS_CATEGORIE: Record<string, string> = {
  NOURRITURE: "bg-success/10 text-success",
  BOISSON: "bg-accent/10 text-accent",
  SAUCE: "bg-danger/10 text-danger",
  ACCESSOIRE: "bg-warning/10 text-warning",
  AUTRE: "bg-muted/10 text-muted",
};

const STATUTS_FILTRE = [
  { id: "all", label: "Tous statuts" },
  { id: "actif", label: "Actifs" },
  { id: "inactif", label: "Inactifs" },
];

export default function PageSupplements() {
  const { data, isLoading } = useSupplementListQuery();
  const supprimer = useSupprimerSupplementMutation();
  const confirmer = useConfirmation();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<ISupplement | null>(null);
  const [filtreCategorie, setFiltreCategorie] = useState<string>("all");
  const [filtreStatut, setFiltreStatut] = useState<string>("all");

  const supplementsTout = data ?? [];
  const supplements = useMemo(() => {
    return supplementsTout.filter((s) => {
      if (filtreCategorie !== "all" && s.categorie !== filtreCategorie) return false;
      if (filtreStatut === "actif" && !s.actif) return false;
      if (filtreStatut === "inactif" && s.actif) return false;
      return true;
    });
  }, [supplementsTout, filtreCategorie, filtreStatut]);

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }

  function ouvrirEdition(s: ISupplement) {
    setEnEdition(s);
    setModalOuvert(true);
  }

  async function handleSupprimer(s: ISupplement) {
    const ok = await confirmer({
      titre: "Supprimer ce supplément ?",
      description: `Le supplément « ${s.nom} » sera supprimé du catalogue.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(s.id);
  }

  return (
    <PageContainer>
      <NavCatalogue />
      <PageHeader
        titre={`${supplements.length} supplément${supplements.length > 1 ? "s" : ""}`}
        description="Sauces, accompagnements, boissons et options en surcoût proposés à la commande."
        actions={
          <Button variant="primary" className="gap-1.5" onPress={ouvrirCreation}>
            <Plus size={16} />
            Nouveau supplément
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Select
          selectedKey={filtreCategorie}
          onSelectionChange={(k) => setFiltreCategorie(String(k))}
          aria-label="Catégorie"
          className="min-w-[180px]"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="Toutes catégories">Toutes catégories</ListBox.Item>
              {CATEGORIES_SUPPLEMENT.map((c) => (
                <ListBox.Item key={c} id={c} textValue={LABELS_CATEGORIE_SUPPLEMENT[c]}>
                  {LABELS_CATEGORIE_SUPPLEMENT[c]}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          selectedKey={filtreStatut}
          onSelectionChange={(k) => setFiltreStatut(String(k))}
          aria-label="Statut"
          className="min-w-[140px]"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUTS_FILTRE.map((s) => (
                <ListBox.Item key={s.id} id={s.id} textValue={s.label}>{s.label}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {(filtreCategorie !== "all" || filtreStatut !== "all") && (
          <Button
            variant="ghost"
            className="text-xs text-muted h-9 px-2"
            onPress={() => { setFiltreCategorie("all"); setFiltreStatut("all"); }}
          >
            Effacer filtres
          </Button>
        )}
      </div>

        {isLoading ? (
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-64 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : supplements.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-warning/10 inline-flex items-center justify-center mb-3">
              <UtensilsCrossed size={20} className="text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun supplément</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Créez vos premiers suppléments (sauce piquante, double fromage, frites moyennes...) pour
              les rattacher à vos menus.
            </p>
            <Button variant="primary" className="gap-1.5 mt-4" onPress={ouvrirCreation}>
              <Plus size={16} />
              Créer un supplément
            </Button>
          </div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Suppléments">
                <Table.Header className="table-header-libitex">
                  <Table.Column isRowHeader>Supplément</Table.Column>
                  <Table.Column>Catégorie</Table.Column>
                  <Table.Column>Prix</Table.Column>
                  <Table.Column>Statut</Table.Column>
                  <Table.Column className="w-20"> </Table.Column>
                </Table.Header>
                <Table.Body>
                  {supplements.map((s) => (
                    <Table.Row key={s.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-surface-secondary overflow-hidden flex items-center justify-center shrink-0">
                            {s.image ? (
                              <img src={s.image} alt={s.nom} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Package size={18} className="text-muted/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.nom}</p>
                            {s.description && (
                              <p className="text-xs text-muted truncate max-w-md">{s.description}</p>
                            )}
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip className={`text-xs ${COULEURS_CATEGORIE[s.categorie] ?? ""}`}>
                          {LABELS_CATEGORIE_SUPPLEMENT[s.categorie]}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMontant(s.prix)}
                          <span className="text-xs font-normal text-muted ml-0.5">F</span>
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip className={`text-xs ${
                          s.actif ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                        }`}>
                          {s.actif ? "Actif" : "Inactif"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button
                            variant="ghost"
                            className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                            onPress={() => ouvrirEdition(s)}
                            aria-label={`Modifier ${s.nom}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                            onPress={() => handleSupprimer(s)}
                            aria-label={`Supprimer ${s.nom}`}
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

      <ModalSupplement
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        supplement={enEdition}
      />
    </PageContainer>
  );
}
