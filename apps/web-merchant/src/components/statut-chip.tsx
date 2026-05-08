"use client";

import { Chip } from "@heroui/react";
import type { ReactNode } from "react";

export type VarianteStatut = "active" | "pending" | "failed" | "draft" | "info";

interface Props {
  /** Variante visuelle conforme DS §8.5. */
  variante: VarianteStatut;
  /** Affiche un point colore a gauche du libelle (defaut: true). */
  avecPoint?: boolean;
  /** Classes additionnelles pour ajuster taille/espacement. */
  className?: string;
  children: ReactNode;
}

/**
 * Variantes (DS §8.5) : background pastel + texte couleur pleine.
 * Mappees sur les tokens semantiques HeroUI v3 (success/warning/danger).
 * Draft et Info utilisent les neutrals/info de la palette LIBITEX.
 */
const VARIANTES: Record<VarianteStatut, { chip: string; dot: string }> = {
  active: {
    chip: "bg-success/10 text-success",
    dot: "bg-success",
  },
  pending: {
    chip: "bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  failed: {
    chip: "bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  draft: {
    chip: "bg-neutral-100 text-neutral-600",
    dot: "bg-neutral-400",
  },
  info: {
    chip: "bg-accent/10 text-accent",
    dot: "bg-accent",
  },
};

/**
 * Badge de statut normalise selon le DS §8.5.
 * Usage typique : statut de ticket (Active/Pending/Failed), facture B2B
 * (Paid/Overdue), commande e-commerce (Draft/Active).
 */
export function StatutChip({ variante, avecPoint = true, className = "", children }: Props) {
  const styles = VARIANTES[variante];
  return (
    <Chip className={`text-xs gap-1.5 ${styles.chip} ${className}`}>
      {avecPoint && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </Chip>
  );
}
