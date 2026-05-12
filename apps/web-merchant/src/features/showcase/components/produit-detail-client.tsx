"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, MessageCircle, Phone } from "lucide-react";
import { formatMontant } from "@/features/vente/utils/format";
import type { IBoutiquePublic, IProduitPublic } from "../types/showcase.type";

interface Props {
  boutique: IBoutiquePublic;
  produit: IProduitPublic;
}

/**
 * Partie interactive du detail produit : selection variante, gallery
 * d'images, lien WhatsApp pre-rempli. Le parent SSR a deja fetche les
 * donnees (HTML statique + metadata OG).
 */
export function ProduitDetailClient({ boutique, produit }: Props) {
  const [varianteId, setVarianteId] = useState<string>("");
  const [imageActive, setImageActive] = useState<number>(0);

  const variante = produit.variantes.find((v) => v.id === varianteId) ?? produit.variantes[0];
  const prix = variante?.prixDetail ?? 0;
  const prixPromo = produit.enPromotion && produit.prixPromotion ? produit.prixPromotion : null;

  const message = encodeURIComponent(
    `Bonjour ${boutique.nom}, je suis interesse(e) par ${produit.nom}`
    + (variante?.nom ? ` (${variante.nom})` : ""),
  );
  const numero = boutique.telephone?.replace(/[^\d]/g, "");
  const whatsapp = numero ? `https://wa.me/${numero}?text=${message}` : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <Link href={`/boutique/${boutique.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent mb-4">
        <ArrowLeft size={14} /> Retour
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="aspect-square bg-surface-secondary rounded-xl overflow-hidden flex items-center justify-center">
            {produit.images[imageActive] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produit.images[imageActive]} alt={produit.nom} className="w-full h-full object-cover" />
            ) : (
              <Package size={48} className="text-muted opacity-30" />
            )}
          </div>
          {produit.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {produit.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setImageActive(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    imageActive === i ? "border-accent" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${produit.nom} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {produit.marque && (
            <p className="text-xs text-muted uppercase tracking-wide mb-1">{produit.marque}</p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{produit.nom}</h1>

          <div className="mt-3 flex items-baseline gap-3">
            {prixPromo ? (
              <>
                <span className="text-3xl font-bold text-danger tabular-nums">
                  {formatMontant(prixPromo)}
                  <span className="text-base font-normal ml-1.5">{boutique.devise}</span>
                </span>
                <span className="text-base text-muted line-through tabular-nums">
                  {formatMontant(prix)}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {formatMontant(prix)}
                <span className="text-base font-normal text-muted ml-1.5">{boutique.devise}</span>
              </span>
            )}
          </div>

          {produit.enRupture && (
            <span className="inline-block mt-3 text-xs font-semibold uppercase text-danger bg-danger/10 px-2 py-1 rounded">
              En rupture
            </span>
          )}

          {produit.description && (
            <p className="mt-4 text-sm text-foreground whitespace-pre-line leading-relaxed">
              {produit.description}
            </p>
          )}

          {produit.variantes.length > 1 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-muted mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {produit.variantes.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVarianteId(v.id)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      (varianteId || produit.variantes[0]?.id) === v.id
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-surface border-border hover:border-accent/40"
                    }`}
                  >
                    {v.nom || v.sku} — {formatMontant(v.prixDetail)} {boutique.devise}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-lg bg-success text-success-foreground hover:brightness-95"
              >
                <MessageCircle size={16} /> Commander sur WhatsApp
              </a>
            )}
            {boutique.telephone && (
              <a
                href={`tel:${boutique.telephone.replace(/\s/g, "")}`}
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-lg bg-surface border border-border text-foreground hover:border-accent/40"
              >
                <Phone size={16} /> Appeler {boutique.telephone}
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
