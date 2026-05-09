"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { NavCatalogue } from "@/components/layout/nav-catalogue";
import {
  useProduitListQuery, useCategorieListQuery,
} from "@/features/catalogue/queries/produit-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { SelectCategorieArborescence } from "@/features/catalogue/components/select-categorie-arborescence";
import type { IProduit } from "@/features/catalogue/types/produit.type";
import {
  Table, Chip, Button, Skeleton, SearchField, Input, Select, ListBox,
} from "@heroui/react";
import { Package, Plus, Pencil, AlertTriangle, Copy, Trash2, Folder } from "lucide-react";
import { useSupprimerProduitMutation } from "@/features/catalogue/queries/produit-delete.mutation";
import { useConfirmation } from "@/providers/confirmation-provider";

function formatPrix(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const LABELS_TYPE: Record<string, { label: string; color: string }> = {
  SIMPLE: { label: "Standard", color: "primary" },
  VARIANT: { label: "Variantes", color: "secondary" },
  SERIALIZED: { label: "Sérialisé", color: "warning" },
  PERISHABLE: { label: "Périssable", color: "success" },
  MENU: { label: "Menu", color: "warning" },
};

/** Tous les types disponibles, filtres par typesProduitsAutorises de la boutique. */
const TOUS_TYPES_FILTRE: { id: string; label: string }[] = [
  { id: "SIMPLE", label: "Standard" },
  { id: "VARIANT", label: "Variantes" },
  { id: "SERIALIZED", label: "Sérialisé" },
  { id: "PERISHABLE", label: "Périssable" },
  { id: "MENU", label: "Menu" },
];

const STATUTS_FILTRE = [
  { id: "all", label: "Tous statuts" },
  { id: "actif", label: "Actifs" },
  { id: "inactif", label: "Inactifs" },
];

export default function PageCatalogue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<string>("all");
  const [filtreCategorie, setFiltreCategorie] = useState<string>("all");
  const [filtreStatut, setFiltreStatut] = useState<string>("all");

  // Drill-down depuis /categories : pre-rempli filtreCategorie via ?categorie=<id>.
  // Une fois consomme, on nettoie l'URL pour eviter de re-filtrer apres reset.
  const categorieParam = searchParams.get("categorie");
  useEffect(() => {
    if (categorieParam) {
      setFiltreCategorie(categorieParam);
      setPage(1);
      router.replace("/catalogue");
    }
  }, [categorieParam, router]);

  const { data: boutique } = useBoutiqueActiveQuery();
  const { data: categories } = useCategorieListQuery();
  const { data, isLoading } = useProduitListQuery(page, recherche || undefined, {
    typeProduit: filtreType !== "all" ? filtreType : undefined,
    categorieId: filtreCategorie !== "all" ? filtreCategorie : undefined,
    actif: filtreStatut === "actif" ? true : filtreStatut === "inactif" ? false : undefined,
  });
  const supprimer = useSupprimerProduitMutation();
  const confirmer = useConfirmation();

  async function handleSupprimer(p: IProduit) {
    const ok = await confirmer({
      titre: "Supprimer ce produit ?",
      description: `« ${p.nom} » et ses ${p.variantes.length} variante${p.variantes.length > 1 ? "s" : ""} seront supprimés. L'historique de stock reste consultable mais le produit n'apparaît plus au POS.`,
      actionLibelle: "Supprimer définitivement",
    });
    if (!ok) return;
    await supprimer.mutateAsync(p.id);
  }

  const produits = data?.data ?? [];
  const meta = data?.meta;

  // Filtre Type adapte au secteur d'activite : on ne montre que les types
  // que la boutique peut creer (RESTAURATION → SIMPLE+MENU, BIJOUTERIE →
  // SIMPLE+SERIALIZED, etc.). Si la boutique n'a pas de restriction (AUTRE),
  // on affiche tout.
  const typesFiltre = useMemo(() => {
    const autorises = boutique?.typesProduitsAutorises;
    const types = autorises && autorises.length > 0
      ? TOUS_TYPES_FILTRE.filter((t) => (autorises as readonly string[]).includes(t.id))
      : TOUS_TYPES_FILTRE;
    return [{ id: "all", label: "Tous types" }, ...types];
  }, [boutique?.typesProduitsAutorises]);

  // Nom de la categorie active (pour le bandeau drill-down)
  const categorieActive = filtreCategorie !== "all"
    ? categories?.find((c) => c.id === filtreCategorie)
    : undefined;

  function changerFiltre(setter: (v: string) => void) {
    return (v: string) => { setter(v); setPage(1); };
  }

  return (
    <PageContainer>
      <NavCatalogue />

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <SearchField
          value={recherche}
          onChange={(v) => { setRecherche(v); setPage(1); }}
          aria-label="Rechercher un produit"
          className="w-full max-w-sm"
        >
          <Input placeholder="Rechercher un produit..." />
        </SearchField>
        <Link href="/catalogue/nouveau">
          <Button variant="primary" className="gap-1.5 shrink-0">
            <Plus size={16} />
            Nouveau produit
          </Button>
        </Link>
      </div>

      {categorieActive && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
          <Folder size={14} className="text-accent shrink-0" />
          <span className="text-accent font-medium">{categorieActive.nom}</span>
          <span className="text-muted text-xs">
            {meta?.total ?? 0} produit{(meta?.total ?? 0) > 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            className="ml-auto text-xs text-muted hover:text-foreground h-7 px-2"
            onPress={() => { setFiltreCategorie("all"); setPage(1); }}
          >
            Tout afficher
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Select
          selectedKey={filtreType}
          onSelectionChange={(k) => changerFiltre(setFiltreType)(String(k))}
          aria-label="Type"
          className="min-w-[160px]"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {typesFiltre.map((t) => (
                <ListBox.Item key={t.id} id={t.id} textValue={t.label}>{t.label}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <SelectCategorieArborescence
          categories={categories ?? []}
          valeur={filtreCategorie === "all" ? "" : filtreCategorie}
          onChange={(v) => changerFiltre(setFiltreCategorie)(v || "all")}
          label="Catégorie"
          optionVideLabel="Toutes catégories"
          className="min-w-[200px]"
        />

        <Select
          selectedKey={filtreStatut}
          onSelectionChange={(k) => changerFiltre(setFiltreStatut)(String(k))}
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

        {(filtreType !== "all" || filtreCategorie !== "all" || filtreStatut !== "all") && (
          <Button
            variant="ghost"
            className="text-xs text-muted h-9 px-2"
            onPress={() => {
              setFiltreType("all");
              setFiltreCategorie("all");
              setFiltreStatut("all");
              setPage(1);
            }}
          >
            Effacer filtres
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : produits.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border py-16 text-center">
          <Package size={32} className="text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">
            {recherche || filtreType !== "all" || filtreCategorie !== "all" || filtreStatut !== "all"
              ? "Aucun produit pour ces filtres"
              : "Votre catalogue est vide"}
          </p>
          <p className="text-sm text-muted mt-1 mb-4">
            {recherche || filtreType !== "all" || filtreCategorie !== "all" || filtreStatut !== "all"
              ? "Modifiez ou effacez les filtres pour voir d'autres produits"
              : "Ajoutez votre premier produit pour commencer à vendre"}
          </p>
          {!recherche && filtreType === "all" && filtreCategorie === "all" && filtreStatut === "all" && (
            <Link href="/catalogue/nouveau">
              <Button variant="primary" className="gap-1.5">
                <Plus size={16} />
                Ajouter un produit
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Catalogue produits">
              <Table.Header className="table-header-libitex">
                <Table.Column isRowHeader>Produit</Table.Column>
                <Table.Column>Type</Table.Column>
                <Table.Column>Variantes</Table.Column>
                <Table.Column>Prix détail</Table.Column>
                <Table.Column>Statut</Table.Column>
                <Table.Column className="w-12"> </Table.Column>
              </Table.Header>
              <Table.Body>
                {produits.map((p: IProduit) => {
                  const variante = p.variantes[0];
                  const typeInfo = LABELS_TYPE[p.typeProduit] || { label: p.typeProduit, color: "default" };
                  return (
                    <Table.Row key={p.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-secondary overflow-hidden flex items-center justify-center shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.nom} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Package size={16} className="text-muted/50" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.nom}</p>
                            <div className="flex items-center gap-2">
                              {p.marque && <span className="text-xs text-muted">{p.marque}</span>}
                              <span className="text-xs font-mono text-muted">{variante?.sku}</span>
                            </div>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip className="text-xs">{typeInfo.label}</Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm text-neutral-600 tabular-nums">{p.variantes.length}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {variante ? formatPrix(variante.prixDetail) : "--"} F
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Chip className={`text-xs ${
                            p.actif
                              ? "bg-success/10 text-success"
                              : "bg-muted/10 text-muted"
                          }`}>
                            {p.actif ? "Actif" : "Inactif"}
                          </Chip>
                          {p.enRupture && (
                            <Chip className="text-xs gap-1 bg-warning/10 text-warning">
                              <AlertTriangle size={10} />
                              Rupture
                            </Chip>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-0.5 justify-end">
                          <Link
                            href={`/catalogue/nouveau?dupliquer=${p.id}`}
                            aria-label={`Dupliquer ${p.nom}`}
                          >
                            <Button
                              variant="ghost"
                              className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                            >
                              <Copy size={14} />
                            </Button>
                          </Link>
                          <Link href={`/catalogue/${p.id}`} aria-label={`Modifier ${p.nom}`}>
                            <Button
                              variant="ghost"
                              className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                            >
                              <Pencil size={14} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                            onPress={() => handleSupprimer(p)}
                            isDisabled={supprimer.isPending}
                            aria-label={`Supprimer ${p.nom}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-neutral-400">
            {meta.total} produit{meta.total > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "primary" : "ghost"}
                className="w-8 h-8 min-w-0 p-0 text-sm"
                onPress={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
