"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import type { IProduit } from "@/features/catalogue/types/produit.type";
import { ModalCreerProduit } from "@/features/catalogue/components/modal-creer-produit";
import { Table, Chip, Button, Skeleton, SearchField, Input } from "@heroui/react";
import { Package, Plus } from "lucide-react";

function formatPrix(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const LABELS_TYPE: Record<string, { label: string; color: string }> = {
  SIMPLE: { label: "Standard", color: "primary" },
  VARIANT: { label: "Variantes", color: "secondary" },
  SERIALIZED: { label: "Serialise", color: "warning" },
  PERISHABLE: { label: "Perissable", color: "success" },
};

export default function PageCatalogue() {
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [modalOuvert, setModalOuvert] = useState(false);
  const { data, isLoading } = useProduitListQuery(page, recherche || undefined);

  const produits = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <Topbar titre="Catalogue" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <SearchField
            value={recherche}
            onChange={(v) => { setRecherche(v); setPage(1); }}
            aria-label="Rechercher un produit"
            className="w-full max-w-sm"
          >
            <Input placeholder="Rechercher un produit..." />
          </SearchField>
          <Button variant="primary" className="gap-1.5 shrink-0" onPress={() => setModalOuvert(true)}>
            <Plus size={16} />
            Nouveau produit
          </Button>
        </div>

        {/* Tableau */}
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
            <p className="text-sm text-foreground font-medium">Votre catalogue est vide</p>
            <p className="text-sm text-muted mt-1 mb-4">Ajoutez votre premier produit pour commencer a vendre</p>
            <Button variant="primary" className="gap-1.5" onPress={() => setModalOuvert(true)}>
              <Plus size={16} />
              Ajouter un produit
            </Button>
          </div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Catalogue produits">
                <Table.Header>
                  <Table.Column isRowHeader>Produit</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column>Variantes</Table.Column>
                  <Table.Column>Prix detail</Table.Column>
                </Table.Header>
                <Table.Body>
                  {produits.map((p: IProduit) => {
                    const variante = p.variantes[0];
                    const typeInfo = LABELS_TYPE[p.typeProduit] || { label: p.typeProduit, color: "default" };
                    return (
                      <Table.Row key={p.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                              <Package size={16} className="text-neutral-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-800">{p.nom}</p>
                              <div className="flex items-center gap-2">
                                {p.marque && <span className="text-xs text-neutral-400">{p.marque}</span>}
                                <span className="text-xs font-mono text-neutral-400">{variante?.sku}</span>
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
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {/* Pagination */}
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
      </div>

      <ModalCreerProduit
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
      />
    </>
  );
}
