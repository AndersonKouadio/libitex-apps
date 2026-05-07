"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchField, Input } from "@heroui/react";
import { Search, Package } from "lucide-react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import type { IStockEmplacement } from "@/features/stock/types/stock.type";
import { CarteArticle } from "./carte-article";

interface Props {
  produits: IProduit[];
  stocks: IStockEmplacement[] | undefined;
  onAjouter: (produit: IProduit, variante: IVariante) => void;
}

export function GrilleProduits({ produits, stocks, onAjouter }: Props) {
  const [recherche, setRecherche] = useState("");

  const stockMap = useMemo(() => {
    if (!stocks) return null;
    return new Map(stocks.map((s) => [s.varianteId, s.quantite]));
  }, [stocks]);

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtres.flatMap((produit) =>
              produit.variantes.map((variante) => (
                <CarteArticle
                  key={variante.id}
                  produit={produit}
                  variante={variante}
                  stock={stockMap?.get(variante.id) ?? null}
                  onAjouter={() => onAjouter(produit, variante)}
                />
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
