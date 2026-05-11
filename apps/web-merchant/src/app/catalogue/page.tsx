"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Table, Chip, Button, Skeleton, SearchField, Input, Select, ListBox, toast,
} from "@heroui/react";
import { Package, Plus, Pencil, AlertTriangle, Copy, Trash2, Folder, Upload, ChevronUp, ChevronDown, Download } from "lucide-react";
import { useSupprimerProduitMutation } from "@/features/catalogue/queries/produit-delete.mutation";
import { useConfirmation } from "@/providers/confirmation-provider";
import { ToggleActifProduit } from "@/features/catalogue/components/toggle-actif-produit";
import { BarreActionsLot } from "@/features/catalogue/components/barre-actions-lot";
import { catalogueAPI } from "@/features/catalogue/apis/catalogue.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { produitsVersCsv } from "@/lib/csv";

function formatPrix(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

type ColTri = "nom" | "typeProduit" | "variantes" | "prixDetail" | "actif";

interface EtatTri { col: ColTri | null; ordre: "asc" | "desc" }

function BoutonTri({
  col, label, tri, onTri,
}: { col: ColTri; label: string; tri: EtatTri; onTri: (c: ColTri) => void }) {
  const actif = tri.col === col;
  return (
    <button
      type="button"
      onClick={() => onTri(col)}
      className="flex items-center gap-1 hover:text-accent transition-colors w-full text-left"
    >
      {label}
      {actif && (tri.ordre === "asc"
        ? <ChevronUp size={12} className="text-accent" />
        : <ChevronDown size={12} className="text-accent" />)}
    </button>
  );
}

/**
 * Checkbox du header avec gestion correcte des 3 etats :
 * - aucun coche : decoche
 * - tous coches : coche
 * - certains seulement : indeterminate (case avec un trait, signal visuel
 *   que la selection est partielle). L'attribut indeterminate n'existe
 *   pas en JSX, il doit etre defini en JS via une ref.
 */
const HeaderCheckbox = React.forwardRef<HTMLInputElement, {
  produits: ReadonlyArray<{ id: string }>;
  selection: ReadonlySet<string>;
  onToggleTout: (selected: boolean, ids: string[]) => void;
}>(function HeaderCheckbox({ produits, selection, onToggleTout }, ref) {
  const ids = produits.map((p) => p.id);
  const tousCoches = ids.length > 0 && ids.every((id) => selection.has(id));
  const certainsCoches = !tousCoches && ids.some((id) => selection.has(id));

  // Synchronise l'attribut indeterminate (DOM only, pas dispo en JSX)
  useEffect(() => {
    if (ref && typeof ref !== "function" && ref.current) {
      ref.current.indeterminate = certainsCoches;
    }
  }, [certainsCoches, ref]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Sélectionner toute la page"
      checked={tousCoches}
      onChange={(e) => onToggleTout(e.target.checked, ids)}
      className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
    />
  );
});

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
  const { token } = useAuth();
  const [exportEnCours, setExportEnCours] = useState(false);

  /**
   * Export complet du catalogue (toutes les pages, en parallele apres
   * avoir lu le total via le premier appel). Inclut les produits
   * inactifs pour offrir une vraie sauvegarde.
   */
  async function handleExporter() {
    if (!token) return;
    setExportEnCours(true);
    try {
      const premier = await catalogueAPI.listerProduits(token, { page: 1, isSupplement: false });
      let tous = [...premier.data];
      const totalPages = premier.meta?.totalPages ?? 1;
      if (totalPages > 1) {
        const restes = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map((page) =>
            catalogueAPI.listerProduits(token, { page, isSupplement: false }),
          ),
        );
        restes.forEach((r) => tous.push(...r.data));
      }
      const csv = produitsVersCsv(tous);
      // BOM UTF-8 (﻿) pour qu'Excel detecte l'encodage et n'affiche
      // pas "?" sur les accents.
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogue-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${tous.length} produit${tous.length > 1 ? "s exportés" : " exporté"}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de l'export");
    } finally {
      setExportEnCours(false);
    }
  }
  // Selection en lot. Set d'IDs : conservee a travers la pagination,
  // reset au clic Annuler ou apres une action en masse.
  // Note : on utilise des inputs natifs <input type="checkbox"> car le
  // Checkbox HeroUI v3 dans une Table exige slot="selection" qui le rend
  // controle exclusivement par React Aria — incompatible avec notre
  // gestion manuelle de la selection.
  const [selection, setSelection] = useState<Set<string>>(new Set());

  // Tri front-only de la page courante. 3 etats : asc -> desc -> aucun.
  // Pas de persistance URL pour l'instant (suffit le temps d'une recherche).
  const [tri, setTri] = useState<{ col: ColTri | null; ordre: "asc" | "desc" }>({ col: null, ordre: "asc" });

  function basculerTri(col: ColTri) {
    setTri((prev) => {
      if (prev.col !== col) return { col, ordre: "asc" };
      if (prev.ordre === "asc") return { col, ordre: "desc" };
      return { col: null, ordre: "asc" };
    });
  }

  function toggleLigne(id: string, selected: boolean) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id); else next.delete(id);
      return next;
    });
  }
  function toggleTout(selected: boolean, ids: string[]) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (selected) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  // Ref + effet pour l'etat indeterminé du checkbox header :
  // - cocher : tous les produits visibles sont selectionnes
  // - indeterminate : au moins un mais pas tous
  // - decocher : aucun
  // Sans ce useEffect le state intermediaire (qq lignes cochees) faisait
  // que le header restait visuellement vide meme apres avoir tout coche
  // un par un — l'attribut HTML indeterminate doit etre defini en JS.
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  async function handleSupprimer(p: IProduit) {
    const ok = await confirmer({
      titre: "Supprimer ce produit ?",
      description: `« ${p.nom} » et ses ${p.variantes.length} variante${p.variantes.length > 1 ? "s" : ""} seront supprimés. L'historique de stock reste consultable mais le produit n'apparaît plus au POS.`,
      actionLibelle: "Supprimer définitivement",
    });
    if (!ok) return;
    await supprimer.mutateAsync(p.id);
  }

  const produitsBruts = data?.data ?? [];
  const meta = data?.meta;

  const produits = useMemo(() => {
    if (!tri.col) return produitsBruts;
    const arr = [...produitsBruts];
    const sens = tri.ordre === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const valeur = (p: IProduit) => {
        switch (tri.col) {
          case "nom": return p.nom.toLowerCase();
          case "typeProduit": return p.typeProduit;
          case "variantes": return p.variantes.length;
          case "prixDetail": return p.variantes[0]?.prixDetail ?? 0;
          case "actif": return p.actif ? 1 : 0;
          default: return 0;
        }
      };
      const va = valeur(a), vb = valeur(b);
      if (va < vb) return -1 * sens;
      if (va > vb) return 1 * sens;
      return 0;
    });
    return arr;
  }, [produitsBruts, tri]);

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
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            className="gap-1.5"
            onPress={handleExporter}
            isDisabled={exportEnCours || produits.length === 0}
          >
            <Download size={16} />
            {exportEnCours ? "Export..." : "Exporter CSV"}
          </Button>
          <Link href="/catalogue/import">
            <Button variant="ghost" className="gap-1.5">
              <Upload size={16} />
              Importer CSV
            </Button>
          </Link>
          <Link href="/catalogue/nouveau">
            <Button variant="primary" className="gap-1.5">
              <Plus size={16} />
              Nouveau produit
            </Button>
          </Link>
        </div>
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
                <Table.Column className="w-10">
                  <HeaderCheckbox
                    ref={headerCheckboxRef}
                    produits={produits}
                    selection={selection}
                    onToggleTout={toggleTout}
                  />
                </Table.Column>
                <Table.Column isRowHeader>
                  <BoutonTri col="nom" label="Produit" tri={tri} onTri={basculerTri} />
                </Table.Column>
                <Table.Column>
                  <BoutonTri col="typeProduit" label="Type" tri={tri} onTri={basculerTri} />
                </Table.Column>
                <Table.Column>
                  <BoutonTri col="variantes" label="Variantes" tri={tri} onTri={basculerTri} />
                </Table.Column>
                <Table.Column>
                  <BoutonTri col="prixDetail" label="Prix détail" tri={tri} onTri={basculerTri} />
                </Table.Column>
                <Table.Column>
                  <BoutonTri col="actif" label="Statut" tri={tri} onTri={basculerTri} />
                </Table.Column>
                <Table.Column className="w-12"> </Table.Column>
              </Table.Header>
              <Table.Body>
                {produits.map((p: IProduit) => {
                  const variante = p.variantes[0];
                  const typeInfo = LABELS_TYPE[p.typeProduit] || { label: p.typeProduit, color: "default" };
                  return (
                    <Table.Row key={p.id}>
                      <Table.Cell>
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${p.nom}`}
                          checked={selection.has(p.id)}
                          onChange={(e) => toggleLigne(p.id, e.target.checked)}
                          className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                        />
                      </Table.Cell>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <ToggleActifProduit produitId={p.id} produitNom={p.nom} actif={p.actif} />
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

      {selection.size > 0 && (
        <BarreActionsLot
          selection={Array.from(selection)}
          categories={categories ?? []}
          onTermine={() => setSelection(new Set())}
        />
      )}
    </PageContainer>
  );
}
