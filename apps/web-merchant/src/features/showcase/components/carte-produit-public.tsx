"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import type { IProduitPublic } from "../types/showcase.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  slug: string;
  produit: IProduitPublic;
  devise: string;
}

export function CarteProduitPublic({ slug, produit, devise }: Props) {
  const prix = produit.variantes[0]?.prixDetail ?? 0;
  const prixPromo = produit.enPromotion && produit.prixPromotion ? produit.prixPromotion : null;
  const image = produit.images[0];

  return (
    <Link
      href={`/boutique/${slug}/produits/${produit.id}`}
      className="block bg-surface rounded-xl border border-border overflow-hidden hover:border-accent/40 transition-colors"
    >
      <div className="aspect-square bg-surface-secondary flex items-center justify-center">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={produit.nom} className="w-full h-full object-cover" />
        ) : (
          <Package size={32} className="text-muted opacity-30" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5em]">{produit.nom}</p>
        {produit.marque && (
          <p className="text-xs text-muted mt-0.5">{produit.marque}</p>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          {prixPromo ? (
            <>
              <span className="text-base font-bold text-danger tabular-nums">
                {formatMontant(prixPromo)} <span className="text-xs font-normal">{devise}</span>
              </span>
              <span className="text-xs text-muted line-through tabular-nums">
                {formatMontant(prix)}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-foreground tabular-nums">
              {formatMontant(prix)} <span className="text-xs font-normal">{devise}</span>
            </span>
          )}
        </div>
        {produit.enRupture && (
          <span className="inline-block mt-2 text-[10px] font-semibold uppercase text-danger bg-danger/10 px-1.5 py-0.5 rounded">
            En rupture
          </span>
        )}
      </div>
    </Link>
  );
}
