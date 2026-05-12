"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@heroui/react";
import { ArrowLeft, Package, MessageCircle, Phone, Share2 } from "lucide-react";
import { formatPrix } from "../utils/format-prix";
import type { IBoutiquePublic, IProduitPublic, IVariantePublic } from "../types/showcase.type";

/**
 * Libelle d'une variante : preference au nom, sinon "Standard" pour eviter
 * d'afficher des SKU bruts comme "SKU-CAF-001" cote client.
 * Fix I7 Module 7.
 */
function libelleVariante(v: IVariantePublic): string {
  return v.nom?.trim() || "Standard";
}

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

  /**
   * Fix m3 Module 7 : Web Share API mobile, fallback clipboard desktop.
   * Permet au client de partager le lien produit en 1 clic (engagement).
   */
  async function partager() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const titre = `${produit.nom} — ${boutique.nom}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titre, url });
        return;
      } catch {
        // utilisateur annule -> on tombe sur la copie clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copie !");
    } catch {
      toast.danger("Copie impossible — copiez manuellement l'URL");
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <Link href={`/boutique/${boutique.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent mb-4">
        <ArrowLeft size={14} /> Retour
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="aspect-square bg-surface-secondary rounded-xl overflow-hidden relative flex items-center justify-center">
            {produit.images[imageActive] ? (
              <Image
                src={produit.images[imageActive]}
                alt={produit.nom}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
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
                  className={`aspect-square rounded-lg overflow-hidden border-2 relative ${
                    imageActive === i ? "border-accent" : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${produit.nom} ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
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
                  {formatPrix(prixPromo, boutique.devise)}
                </span>
                <span className="text-base text-muted line-through tabular-nums">
                  {formatPrix(prix, boutique.devise)}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {formatPrix(prix, boutique.devise)}
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
                    {libelleVariante(v)} — {formatPrix(v.prixDetail, boutique.devise)}
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
            {/* Fix m3 Module 7 : bouton Partager (Web Share API mobile,
                clipboard fallback desktop). */}
            <button
              type="button"
              onClick={partager}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-lg bg-surface border border-border text-foreground hover:border-accent/40"
            >
              <Share2 size={16} /> Partager ce produit
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
