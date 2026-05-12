"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Module 9 D1 : composant generique d'etat vide. Remplace les ~20 blocs
 * inline avec markup quasi identique disperses dans les pages. Garantit
 * une UX coherente : meme padding, meme icone discrete, meme typo.
 *
 * Trois variantes :
 * - `card` : encapsule dans une Card surface + bordure (defaut, pour
 *   pages standards).
 * - `inline` : sans bordure ni fond, pour usage dans une carte/modal
 *   existante.
 * - `subtle` : compact, padding reduit (modales, drawers).
 */
type Variante = "card" | "inline" | "subtle";

/**
 * Couleur de l'icone. `warning` pour les empty states "il manque
 * quelque chose de pre-requis" (emplacement, configuration). `muted`
 * pour les "liste vide" benins.
 */
type Tonalite = "muted" | "warning" | "danger" | "accent";

interface Props {
  icone: LucideIcon;
  titre: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variante?: Variante;
  tonalite?: Tonalite;
  className?: string;
}

const PADDING: Record<Variante, string> = {
  card: "py-16",
  inline: "py-12",
  subtle: "py-8",
};

const WRAPPER: Record<Variante, string> = {
  card: "bg-surface rounded-xl border border-border",
  inline: "",
  subtle: "",
};

const TONS: Record<Tonalite, string> = {
  muted: "bg-muted/10 text-muted",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  accent: "bg-accent/10 text-accent",
};

export function EmptyState({
  icone: Icone,
  titre,
  description,
  action,
  variante = "card",
  tonalite = "muted",
  className = "",
}: Props) {
  return (
    <div
      className={`${WRAPPER[variante]} ${PADDING[variante]} text-center ${className}`}
    >
      <span
        className={`inline-flex w-12 h-12 rounded-full items-center justify-center mb-3 ${TONS[tonalite]}`}
      >
        <Icone size={20} />
      </span>
      <p className="text-sm font-semibold text-foreground">{titre}</p>
      {description && (
        <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
