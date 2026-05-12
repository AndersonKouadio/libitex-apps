"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/browser";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * UI d'erreur pour les segments de route Next.js. Capture la stack
 * + remontee Sentry + bouton "Reessayer" (reset cote Next.js) ou retour
 * accueil.
 *
 * Fix C2 Module 8 : sans cette page, un crash dans un Server Component
 * (ex. fetch fail dans /boutique/[slug]) affiche le 500 par defaut sans
 * capture.
 */
export default function ErrorRoute({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { source: "next-error-tsx", digest: error.digest ?? "" },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <AlertCircle size={28} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Une erreur est survenue</h1>
          <p className="text-sm text-muted mt-1">
            Cette page a rencontre un probleme. Essayez de recharger ou revenez a
            l&apos;accueil.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted mt-2 font-mono">
              Reference : {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-accent-foreground hover:brightness-95"
          >
            <RotateCcw size={14} /> Reessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-foreground hover:border-accent/40"
          >
            <Home size={14} /> Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
