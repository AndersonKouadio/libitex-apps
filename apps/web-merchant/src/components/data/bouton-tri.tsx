"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

export interface EtatTri<C extends string> { col: C | null; ordre: "asc" | "desc" }

interface Props<C extends string> {
  col: C;
  label: string;
  tri: EtatTri<C>;
  onTri: (col: C) => void;
}

/**
 * Bouton d'en-tete de colonne triable. Clic toggle asc/desc et signale
 * la colonne active avec une fleche accentuee. Generique sur la liste
 * des colonnes triables.
 */
export function BoutonTri<C extends string>({ col, label, tri, onTri }: Props<C>) {
  const actif = tri.col === col;
  return (
    <button
      type="button"
      onClick={() => onTri(col)}
      className="flex items-center gap-1 hover:text-accent transition-colors w-full text-left"
    >
      {label}
      {actif && (tri.ordre === "asc"
        ? <ChevronUp size={12} className="text-accent" />
        : <ChevronDown size={12} className="text-accent" />)}
    </button>
  );
}

export function basculerTri<C extends string>(prev: EtatTri<C>, col: C): EtatTri<C> {
  if (prev.col !== col) return { col, ordre: "asc" };
  if (prev.ordre === "asc") return { col, ordre: "desc" };
  return { col: null, ordre: "asc" };
}
