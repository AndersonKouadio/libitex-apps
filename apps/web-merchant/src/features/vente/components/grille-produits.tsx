"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchField, Input, Button } from "@heroui/react";
import { Search, Package } from "lucide-react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import { formatMontant } from "../utils/format";

interface Props {
  produits: IProduit[];
  onAjouter: (produit: IProduit, variante: IVariante) => void;
}

export function GrilleProduits({ produits, onAjouter }: Props) {
  const [recherche, setRecherche] = useState("");

  const terme = recherche.toLowerCase().trim();
  const filtres = terme
    ? produits.filter(
        (p) =>
          p.nom.toLowerCase().includes(terme) ||
          p.variantes.some((v) => v.sku.toLowerCase().includes(terme)),
      )
    : produits;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 py-3 shrink-0">
        <SearchField value={recherche} onChange={setRecherche} aria-label="Rechercher un article">
          <Input placeholder="Rechercher un article ou scanner un code-barres..." autoFocus />
        </SearchField>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtres.length === 0 && produits.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={36} className="text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucun article disponible</p>
            <p className="text-sm text-muted mt-1">
              Ajoutez des produits dans le catalogue et recevez du stock pour commencer a vendre
            </p>
            <Link href="/catalogue" className="inline-block mt-3 text-sm font-medium text-accent hover:underline">
              Gerer le catalogue
            </Link>
          </div>
        ) : filtres.length === 0 ? (
          <div className="py-16 text-center">
            <Search size={28} className="text-muted/30 mx-auto mb-2" />
            <p className="text-sm text-muted">Aucun article ne correspond a la recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filtres.flatMap((produit) =>
              produit.variantes.map((variante) => (
                <Button
                  key={variante.id}
                  variant="outline"
                  className="flex-col items-start justify-start text-left bg-surface p-3 h-auto hover:border-accent hover:shadow-sm"
                  onPress={() => onAjouter(produit, variante)}
                >
                  <span className="text-sm font-medium text-foreground truncate leading-tight w-full">
                    {produit.nom}
                  </span>
                  {variante.nom && (
                    <span className="text-xs text-muted truncate mt-0.5 w-full">{variante.nom}</span>
                  )}
                  <span className="text-[11px] text-muted/70 mt-0.5 font-mono">{variante.sku}</span>
                  <span className="text-base font-semibold text-foreground mt-2 tabular-nums">
                    {formatMontant(variante.prixDetail)}
                    <span className="text-[11px] font-normal text-muted ml-1">F</span>
                  </span>
                </Button>
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
