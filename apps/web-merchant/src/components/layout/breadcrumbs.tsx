"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { construireBreadcrumb } from "./route-meta";

/**
 * Fil d'ariane base sur le pathname courant. Discret, sous le titre dans le Topbar.
 * Cache automatiquement quand on est sur la home (/dashboard) puisqu'il n'y a
 * rien a remonter.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const mailles = construireBreadcrumb(pathname);

  // 1 seule maille = on est a l'accueil, pas la peine de l'afficher.
  if (mailles.length <= 1) return null;

  return (
    <nav aria-label="Fil d'ariane" className="flex items-center gap-1 text-xs text-muted">
      {mailles.map((m, i) => {
        const dernier = i === mailles.length - 1;
        return (
          <span key={m.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="text-muted/40 shrink-0" />}
            {dernier ? (
              <span className="text-foreground font-medium">{m.libelle}</span>
            ) : (
              <Link
                href={m.href}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                {i === 0 && <Home size={11} />}
                {m.libelle}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
