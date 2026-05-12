"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Spinner } from "@heroui/react";
import { ArrowLeft, Package, MessageCircle, Phone } from "lucide-react";
import {
  useBoutiquePubliqueQuery, useProduitPublicQuery,
} from "@/features/showcase/queries/showcase.query";
import { HeaderBoutique } from "@/features/showcase/components/header-boutique";
import { formatMontant } from "@/features/vente/utils/format";

export default function PageProduitPublic({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data: boutique, isLoading: chBoutique } = useBoutiquePubliqueQuery(slug);
  const { data: produit, isLoading: chProduit, error } = useProduitPublicQuery(slug, id);
  const [varianteId, setVarianteId] = useState<string>("");
  const [imageActive, setImageActive] = useState<number>(0);

  if (chBoutique || chProduit) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  }
  if (error || !boutique || !produit) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <p className="text-sm text-foreground">Produit introuvable</p>
          <Link href={`/boutique/${slug}`} className="text-xs text-accent underline mt-2 block">
            Retour a la boutique
          </Link>
        </div>
      </div>
    );
  }

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
    <>
      <HeaderBoutique boutique={boutique} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Link href={`/boutique/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent mb-4">
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

      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted">
        Propulse par <span className="font-semibold text-foreground">LIBITEX</span>
      </footer>
    </>
  );
}
