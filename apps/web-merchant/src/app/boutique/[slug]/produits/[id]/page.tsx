import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { showcaseAPI } from "@/features/showcase/apis/showcase.api";
import { HeaderBoutique } from "@/features/showcase/components/header-boutique";
import { ProduitDetailClient } from "@/features/showcase/components/produit-detail-client";

interface PageParams {
  params: Promise<{ slug: string; id: string }>;
}

export const revalidate = 60;

async function chargerDonnees(slug: string, id: string) {
  try {
    const [boutique, produit] = await Promise.all([
      showcaseAPI.obtenirBoutique(slug, { next: { revalidate: 60 } }),
      showcaseAPI.obtenirProduit(slug, id, { next: { revalidate: 60 } }),
    ]);
    return { boutique, produit };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug, id } = await params;
  const donnees = await chargerDonnees(slug, id);
  if (!donnees) {
    return { title: "Produit introuvable", robots: { index: false } };
  }
  const { boutique, produit } = donnees;
  const title = `${produit.nom} — ${boutique.nom}`;
  const description = produit.description
    ? produit.description.slice(0, 200)
    : `${produit.nom} disponible chez ${boutique.nom}. Commandez directement par WhatsApp.`;
  const image = produit.images[0] ?? boutique.logoUrl ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: boutique.nom,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PageProduitPublic({ params }: PageParams) {
  const { slug, id } = await params;
  const donnees = await chargerDonnees(slug, id);

  // Fix I6 : 404 propre (notFound throw une exception qui rend la 404.tsx).
  if (!donnees) notFound();

  return (
    <>
      <HeaderBoutique boutique={donnees.boutique} />
      <ProduitDetailClient boutique={donnees.boutique} produit={donnees.produit} />
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted">
        Propulse par <span className="font-semibold text-foreground">LIBITEX</span>
      </footer>
    </>
  );
}
