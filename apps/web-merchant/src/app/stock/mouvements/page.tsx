"use client";

import { useState } from "react";
import { Tabs, Pagination, Skeleton, Button } from "@heroui/react";
import { Package, Wheat, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useMouvementsStockQuery } from "@/features/stock/queries/mouvements.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import {
  FiltresMouvements, type FiltresMouvementsValeurs,
} from "@/features/stock/components/filtres-mouvements";
import { TableMouvementsStock } from "@/features/stock/components/table-mouvements-stock";
import { TableMouvementsIngredients } from "@/features/ingredient/components/table-mouvements-ingredients";
import { useMouvementsIngredientsQuery } from "@/features/ingredient/queries/mouvements-ingredients.query";

const FILTRES_VIDES: FiltresMouvementsValeurs = {
  type: "", emplacementId: "", dateDebut: "", dateFin: "",
};

const TYPES_VARIANTES = [
  { id: "STOCK_IN", label: "Réception" },
  { id: "STOCK_OUT", label: "Vente" },
  { id: "TRANSFER_OUT", label: "Transfert ↗" },
  { id: "TRANSFER_IN", label: "Transfert ↘" },
  { id: "ADJUSTMENT", label: "Ajustement" },
  { id: "RETURN_IN", label: "Retour client" },
  { id: "DEFECTIVE_OUT", label: "Défectueux" },
  { id: "WRITE_OFF", label: "Casse / perte" },
];

const TYPES_INGREDIENTS = [
  { id: "STOCK_IN", label: "Réception" },
  { id: "CONSUMPTION", label: "Consommation" },
  { id: "ADJUSTMENT", label: "Ajustement" },
  { id: "WASTE", label: "Casse / perte" },
  { id: "TRANSFER_OUT", label: "Transfert ↗" },
  { id: "TRANSFER_IN", label: "Transfert ↘" },
];

const PAGE_SIZE = 50;

type Onglet = "variantes" | "ingredients";

export default function PageMouvementsStock() {
  const { data: boutique } = useBoutiqueActiveQuery();
  const { data: emplacements } = useEmplacementListQuery();
  const [onglet, setOnglet] = useState<Onglet>("variantes");
  const [pageVar, setPageVar] = useState(1);
  const [pageIng, setPageIng] = useState(1);
  const [filtres, setFiltres] = useState<FiltresMouvementsValeurs>(FILTRES_VIDES);

  // Quand un filtre change on revient page 1.
  function changerFiltres(v: FiltresMouvementsValeurs) {
    setFiltres(v);
    setPageVar(1); setPageIng(1);
  }

  const secteur = boutique?.secteurActivite;
  const ingredientsDispo = secteur === "RESTAURATION" || secteur === "AUTRE";

  const queryVar = useMouvementsStockQuery({
    page: pageVar, pageSize: PAGE_SIZE,
    type: filtres.type || undefined,
    emplacementId: filtres.emplacementId || undefined,
    dateDebut: filtres.dateDebut || undefined,
    dateFin: filtres.dateFin || undefined,
  });

  const queryIng = useMouvementsIngredientsQuery({
    page: pageIng, pageSize: PAGE_SIZE,
    type: filtres.type || undefined,
    emplacementId: filtres.emplacementId || undefined,
    dateDebut: filtres.dateDebut || undefined,
    dateFin: filtres.dateFin || undefined,
  });

  const totalPagesVar = queryVar.data?.meta.totalPages ?? 1;
  const totalPagesIng = queryIng.data?.meta.totalPages ?? 1;

  return (
    <PageContainer>
      <PageHeader
        titre="Historique des mouvements"
        description="Toutes les entrées, sorties, ajustements et transferts — tracés par auteur et horodatés."
        actions={
          <Link href="/stock">
            <Button variant="ghost" className="gap-1.5 text-xs">
              <ArrowLeft size={14} />
              Retour au stock
            </Button>
          </Link>
        }
      />

      <Tabs selectedKey={onglet} onSelectionChange={(k) => setOnglet(k as Onglet)} aria-label="Type de mouvements">
        <Tabs.List>
          <Tabs.Tab id="variantes" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <Package size={14} />
              Produits
            </span>
          </Tabs.Tab>
          {ingredientsDispo && (
            <Tabs.Tab id="ingredients" className="px-4 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5">
                <Wheat size={14} />
                Ingrédients
              </span>
            </Tabs.Tab>
          )}
        </Tabs.List>
      </Tabs>

      <div className="mt-4">
        <FiltresMouvements
          valeurs={filtres}
          onChange={changerFiltres}
          emplacements={emplacements ?? []}
          optionsType={onglet === "variantes" ? TYPES_VARIANTES : TYPES_INGREDIENTS}
        />

        {onglet === "variantes" ? (
          queryVar.isLoading ? <SkeletonLignes />
            : <TableMouvementsStock lignes={queryVar.data?.data ?? []} />
        ) : (
          queryIng.isLoading ? <SkeletonLignes />
            : <TableMouvementsIngredients lignes={queryIng.data?.data ?? []} />
        )}

        {(onglet === "variantes" ? totalPagesVar : totalPagesIng) > 1 && (
          <PaginationBar
            page={onglet === "variantes" ? pageVar : pageIng}
            total={onglet === "variantes" ? totalPagesVar : totalPagesIng}
            onChange={(p) => onglet === "variantes" ? setPageVar(p) : setPageIng(p)}
          />
        )}
      </div>
    </PageContainer>
  );
}

function SkeletonLignes() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
    </div>
  );
}

/**
 * Pagination compacte : <Pagination.Previous> / numeros / <Pagination.Next>.
 * On affiche les 5 pages centrees autour de la courante.
 */
function PaginationBar({
  page, total, onChange,
}: { page: number; total: number; onChange: (p: number) => void }) {
  const debut = Math.max(1, page - 2);
  const fin = Math.min(total, debut + 4);
  const pages: number[] = [];
  for (let i = debut; i <= fin; i++) pages.push(i);
  return (
    <Pagination className="justify-center mt-4">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous isDisabled={page === 1} onPress={() => onChange(page - 1)}>
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        {pages.map((p) => (
          <Pagination.Item key={p}>
            <Pagination.Link isActive={p === page} onPress={() => onChange(p)}>
              {p}
            </Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item>
          <Pagination.Next isDisabled={page === total} onPress={() => onChange(page + 1)}>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
