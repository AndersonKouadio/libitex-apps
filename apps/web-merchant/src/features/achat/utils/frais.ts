import type { CategorieFrais } from "../types/achat.type";

/**
 * Phase A.2 : libelles + classes Tailwind pour les Chip de categorie.
 * Centralise pour cohérence entre modale, liste, et futurs rapports.
 */
export const LIBELLE_CATEGORIE: Record<CategorieFrais, string> = {
  TRANSPORT: "Transport",
  CUSTOMS: "Douane",
  TRANSIT: "Transit",
  INSURANCE: "Assurance",
  HANDLING: "Manutention",
  OTHER: "Autre",
};

/** Description courte de la categorie (hint Select). */
export const HINT_CATEGORIE: Record<CategorieFrais, string> = {
  TRANSPORT: "Fret maritime, terrestre, aerien",
  CUSTOMS: "Droits de douane, taxes import",
  TRANSIT: "Honoraires du transitaire",
  INSURANCE: "Assurance marchandises",
  HANDLING: "Manutention, dechargement, stockage",
  OTHER: "Autres frais lies a l'import",
};

export const CLASSES_CATEGORIE: Record<CategorieFrais, string> = {
  TRANSPORT: "bg-accent/10 text-accent",
  CUSTOMS: "bg-warning/10 text-warning",
  TRANSIT: "bg-info/10 text-info",
  INSURANCE: "bg-success/10 text-success",
  HANDLING: "bg-muted/10 text-muted",
  OTHER: "bg-foreground/10 text-foreground",
};

export function libelleCategorie(c: string): string {
  return LIBELLE_CATEGORIE[c as CategorieFrais] ?? c;
}

export function classesCategorie(c: string): string {
  return CLASSES_CATEGORIE[c as CategorieFrais] ?? "bg-muted/10 text-muted";
}
