"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card, Button, Select, ListBox, Label, SearchField, Skeleton,
} from "@heroui/react";
import { ArrowLeft, Printer, Plus, Minus, Trash2, Tag, X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-states/empty-state";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import {
  EtiquetteProduit, FORMATS_ETIQUETTE, type FormatEtiquette,
} from "@/features/catalogue/components/etiquettes/etiquette-produit";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";

interface Selection {
  varianteId: string;
  produit: IProduit;
  variante: IVariante;
  quantite: number;
}

export default function PageEtiquettes() {
  const [recherche, setRecherche] = useState("");
  const [format, setFormat] = useState<FormatEtiquette>("A4_24");
  const [selections, setSelections] = useState<Selection[]>([]);

  const { data: produitsData, isLoading } = useProduitListQuery(1, recherche || undefined);
  const produits = produitsData?.data ?? [];

  // Aplatit les variantes (produit + variante) pour selection unitaire.
  const variantesDispos = useMemo(() => {
    const liste: { produit: IProduit; variante: IVariante }[] = [];
    for (const p of produits) {
      for (const v of p.variantes ?? []) {
        liste.push({ produit: p, variante: v });
      }
    }
    return liste;
  }, [produits]);

  function ajouter(produit: IProduit, variante: IVariante) {
    setSelections((prev) => {
      const exist = prev.find((s) => s.varianteId === variante.id);
      if (exist) {
        return prev.map((s) =>
          s.varianteId === variante.id ? { ...s, quantite: s.quantite + 1 } : s,
        );
      }
      return [...prev, { varianteId: variante.id, produit, variante, quantite: 1 }];
    });
  }

  function modifierQuantite(varianteId: string, delta: number) {
    setSelections((prev) =>
      prev
        .map((s) =>
          s.varianteId === varianteId ? { ...s, quantite: Math.max(0, s.quantite + delta) } : s,
        )
        .filter((s) => s.quantite > 0),
    );
  }

  function definirQuantite(varianteId: string, q: number) {
    const v = Math.max(0, Math.min(999, q));
    setSelections((prev) =>
      v === 0
        ? prev.filter((s) => s.varianteId !== varianteId)
        : prev.map((s) => (s.varianteId === varianteId ? { ...s, quantite: v } : s)),
    );
  }

  function retirer(varianteId: string) {
    setSelections((prev) => prev.filter((s) => s.varianteId !== varianteId));
  }

  // Liste developpee : 1 element par etiquette a imprimer.
  const etiquettes = useMemo(() => {
    return selections.flatMap((s) =>
      Array.from({ length: s.quantite }, (_, i) => ({
        cle: `${s.varianteId}-${i}`,
        nomProduit: s.produit.nom,
        nomVariante: s.variante.nom ?? null,
        sku: s.variante.sku,
        prix: s.variante.prixDetail,
        marque: s.produit.marque ?? null,
      })),
    );
  }, [selections]);

  const totalEtiquettes = etiquettes.length;
  const formatInfo = FORMATS_ETIQUETTE[format];

  return (
    <PageContainer>
      <PageHeader
        titre="Imprimer des étiquettes code-barres"
        description="Sélectionnez les produits, choisissez un format puis lancez l'impression. Les étiquettes utilisent le Code 128 et incluent le SKU sous le code-barres."
        actions={
          <Link href="/catalogue">
            <Button variant="ghost" className="gap-1.5 no-print">
              <ArrowLeft size={14} /> Retour au catalogue
            </Button>
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <SearchField value={recherche} onChange={setRecherche} className="flex-1 min-w-[260px]">
          <Label className="sr-only">Rechercher</Label>
          <SearchField.Input placeholder="Rechercher un produit (nom, SKU)..." />
        </SearchField>

        <Select
          selectedKey={format}
          onSelectionChange={(k) => setFormat(k as FormatEtiquette)}
          aria-label="Format d'étiquette"
          className="min-w-[280px]"
        >
          <Label>Format</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {Object.entries(FORMATS_ETIQUETTE).map(([cle, info]) => (
                <ListBox.Item key={cle} id={cle} textValue={info.libelle}>
                  <div>
                    <p className="text-sm">{info.libelle}</p>
                    <p className="text-xs text-muted">{info.description}</p>
                  </div>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {totalEtiquettes > 0 && (
          <Button
            variant="primary"
            className="gap-1.5"
            onPress={() => window.print()}
          >
            <Printer size={14} />
            Imprimer {totalEtiquettes} étiquette{totalEtiquettes > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Liste des produits disponibles */}
        <Card>
          <Card.Header>
            <Card.Title className="text-sm flex items-center gap-2">
              <Tag size={14} />
              Produits disponibles
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-0 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
              </div>
            ) : variantesDispos.length === 0 ? (
              <EmptyState
                icone={Tag}
                titre="Aucun produit"
                description="Modifiez votre recherche."
              />
            ) : (
              <ul className="divide-y divide-border">
                {variantesDispos.map(({ produit, variante }) => (
                  <li
                    key={variante.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{produit.nom}</p>
                      <p className="text-xs text-muted truncate">
                        {variante.nom ? `${variante.nom} · ` : ""}
                        <span className="font-mono">{variante.sku}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="gap-1 text-xs shrink-0"
                      onPress={() => ajouter(produit, variante)}
                    >
                      <Plus size={12} /> Ajouter
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>

        {/* Liste des selections + quantite */}
        <Card>
          <Card.Header>
            <Card.Title className="text-sm flex items-center gap-2">
              <Printer size={14} />
              À imprimer ({totalEtiquettes})
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-0 max-h-[400px] overflow-y-auto">
            {selections.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted">Aucune sélection — ajoutez des produits depuis la liste à gauche.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {selections.map((s) => (
                  <li key={s.varianteId} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">{s.produit.nom}</p>
                      <p className="text-xs text-muted truncate font-mono">{s.variante.sku}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="p-1 h-7 w-7 min-w-0"
                        onPress={() => modifierQuantite(s.varianteId, -1)}
                        aria-label="Diminuer"
                      >
                        <Minus size={12} />
                      </Button>
                      <input
                        type="number"
                        value={s.quantite}
                        onChange={(e) => definirQuantite(s.varianteId, Number(e.target.value))}
                        className="w-12 text-center text-sm border border-border rounded py-0.5 tabular-nums"
                        min={0}
                        max={999}
                      />
                      <Button
                        variant="ghost"
                        className="p-1 h-7 w-7 min-w-0"
                        onPress={() => modifierQuantite(s.varianteId, 1)}
                        aria-label="Augmenter"
                      >
                        <Plus size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="p-1 h-7 w-7 min-w-0 text-danger hover:bg-danger/5"
                        onPress={() => retirer(s.varianteId)}
                        aria-label="Retirer"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
          {selections.length > 0 && (
            <Card.Footer className="border-t border-border">
              <Button
                variant="ghost"
                className="gap-1.5 text-danger text-xs"
                onPress={() => setSelections([])}
              >
                <Trash2 size={12} /> Vider la sélection
              </Button>
            </Card.Footer>
          )}
        </Card>
      </div>

      {/* Apercu impression */}
      {etiquettes.length > 0 && (
        <div className="planche-impression">
          <p className="no-print text-xs text-muted mb-2">
            Aperçu — {totalEtiquettes} étiquette{totalEtiquettes > 1 ? "s" : ""} au format {formatInfo.libelle}
          </p>
          <div className="planche-grille flex flex-wrap gap-1 bg-neutral-100 p-2 rounded">
            {etiquettes.map((e) => (
              <EtiquetteProduit
                key={e.cle}
                nomProduit={e.nomProduit}
                nomVariante={e.nomVariante}
                sku={e.sku}
                prix={e.prix}
                marque={e.marque}
                format={format}
              />
            ))}
          </div>
        </div>
      )}

      {/* Styles d'impression : masque tout sauf la planche, supprime marges */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 5mm;
            size: A4;
          }
          body { background: white !important; }
          .no-print { display: none !important; }
          .planche-impression { display: block !important; }
          .planche-grille {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 0 !important;
            padding: 0 !important;
            background: white !important;
            border-radius: 0 !important;
          }
          .etiquette-cellule {
            border: 1px dashed #ccc !important;
            page-break-inside: avoid;
          }
          /* Masque sidebar, topbar, breadcrumbs, et tout chrome de l'app */
          aside, header, nav { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </PageContainer>
  );
}
