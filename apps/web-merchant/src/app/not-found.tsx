import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable — LIBITEX",
  description: "La page que vous cherchez n'existe pas ou a ete deplacee.",
  robots: { index: false, follow: false },
};

/**
 * Page 404 globale.
 *
 * Fix I1 Module 8 : remplace le fallback Next.js generique par une page
 * coherente avec le design du projet (icone Lucide, couleurs theme, CTA
 * retour accueil). Server Component pour etre indexable par les crawlers
 * (404 = noindex, mais le HTML rendu reste propre).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-muted/10 text-muted flex items-center justify-center mx-auto">
          <FileQuestion size={32} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Erreur 404</p>
          <h1 className="text-xl font-bold text-foreground mt-1">Page introuvable</h1>
          <p className="text-sm text-muted mt-2">
            La page que vous cherchez n&apos;existe pas, a ete deplacee ou n&apos;est plus disponible.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-accent-foreground hover:brightness-95"
          >
            <Home size={14} /> Accueil
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-foreground hover:border-accent/40"
          >
            <ArrowLeft size={14} /> Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
