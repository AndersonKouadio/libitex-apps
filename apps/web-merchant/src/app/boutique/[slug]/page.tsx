import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { showcaseAPI } from "@/features/showcase/apis/showcase.api";
import { HeaderBoutique } from "@/features/showcase/components/header-boutique";
import { ShowcaseClient } from "@/features/showcase/components/showcase-client";

interface PageParams {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-fetch SSR : la boutique + la 1ere page de produits + les categories
 * sont chargees cote serveur, ce qui permet :
 * - Indexation moteurs de recherche (le HTML contient les produits)
 * - Partage social avec preview (OpenGraph)
 * - Affichage immediat sans spinner pour le visiteur
 *
 * Fix C5 + I1 + I6 : SSR + generateMetadata + notFound() pour 404 propre.
 *
 * Revalidate 60s : Next.js cache la page generee pendant 1 min, ce qui
 * combine avec le Cache-Control du backend donne un excellent throughput
 * meme avec une seule instance API.
 */
export const revalidate = 60;

async function chargerBoutique(slug: string) {
  try {
    return await showcaseAPI.obtenirBoutique(slug, { next: { revalidate: 60 } });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const boutique = await chargerBoutique(slug);
  if (!boutique) {
    return { title: "Boutique introuvable", robots: { index: false } };
  }
  const title = `${boutique.nom} — Boutique en ligne`;
  const description = boutique.adresse
    ? `${boutique.nom}, ${boutique.adresse}. Commandez directement par WhatsApp ou telephone.`
    : `${boutique.nom} — catalogue en ligne. Commandez directement par WhatsApp.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: boutique.nom,
      images: boutique.logoUrl ? [{ url: boutique.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: boutique.logoUrl ? [boutique.logoUrl] : undefined,
    },
  };
}

export default async function PageBoutiquePublic({ params }: PageParams) {
  const { slug } = await params;
  const boutique = await chargerBoutique(slug);

  // Fix I6 : 404 propre au lieu d'un message custom (meilleur SEO).
  if (!boutique) notFound();

  // Pre-fetch initial : 1ere page produits + categories en parallele
  const [produitsInitiaux, categoriesInitiales] = await Promise.all([
    showcaseAPI.listerProduits(slug, { limit: 24, offset: 0 }, { next: { revalidate: 60 } }),
    showcaseAPI.listerCategories(slug, { next: { revalidate: 300 } }),
  ]);

  return (
    <>
      <HeaderBoutique boutique={boutique} />
      <ShowcaseClient
        boutique={boutique}
        produitsInitiaux={produitsInitiaux}
        categoriesInitiales={categoriesInitiales}
      />
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted">
        Propulse par <span className="font-semibold text-foreground">LIBITEX</span>
      </footer>
    </>
  );
}
