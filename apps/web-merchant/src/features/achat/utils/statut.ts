import type { StatutCommande } from "../types/achat.type";

/**
 * Libelles francais pour les statuts de commande. Centralise pour eviter
 * la divergence entre /achats/commandes (liste), /achats/commandes/[id]
 * (detail), et tout futur composant (rapports, dashboard).
 */
export const LIBELLE_STATUT_COMMANDE: Record<StatutCommande, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyee",
  PARTIAL: "Partielle",
  RECEIVED: "Recue",
  CANCELLED: "Annulee",
};

/**
 * Classes Tailwind pour le Chip de statut (variant="soft"). Couleurs
 * semantiques : muted brouillon, accent envoyee, warning partielle,
 * success recue, danger annulee.
 */
export const CLASSES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  DRAFT: "bg-muted/10 text-muted",
  SENT: "bg-accent/10 text-accent",
  PARTIAL: "bg-warning/10 text-warning",
  RECEIVED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

/** Helper : retourne le libelle d'un statut, ou la cle si inconnu (defensive). */
export function libelleStatutCommande(statut: string): string {
  return LIBELLE_STATUT_COMMANDE[statut as StatutCommande] ?? statut;
}

/** Helper : retourne les classes Tailwind d'un statut. */
export function classesStatutCommande(statut: string): string {
  return CLASSES_STATUT_COMMANDE[statut as StatutCommande] ?? "bg-muted/10 text-muted";
}
