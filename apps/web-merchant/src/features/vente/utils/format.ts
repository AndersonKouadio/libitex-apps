export function formatMontant(montant: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(montant));
}

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fr-FR", options ?? {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatHeure(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const JOURS_SEMAINE = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Formate une date en libelle relatif a aujourd'hui :
 * - "Aujourd'hui" / "Hier" / "Avant-hier"
 * - "Lundi", "Mardi"... pour les J-3 a J-6
 * - "9 mai" pour la meme annee, sinon "9 mai 2025"
 *
 * Usage : afficher des sessions, tickets, mouvements stock — partout ou
 * un humain raisonne par jour ("j'ai bosse hier") plutot que par date.
 */
export function formatDateRelative(iso: string): string {
  const d = new Date(iso);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const cible = new Date(d);
  cible.setHours(0, 0, 0, 0);
  const diffJours = Math.round((aujourdhui.getTime() - cible.getTime()) / 86400000);

  if (diffJours === 0) return "Aujourd'hui";
  if (diffJours === 1) return "Hier";
  if (diffJours === 2) return "Avant-hier";
  if (diffJours > 0 && diffJours < 7) return JOURS_SEMAINE[d.getDay()] ?? "";

  const memeAnnee = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    ...(memeAnnee ? {} : { year: "numeric" }),
  }).format(d);
}

/** Cle de regroupement par jour (AAAA-MM-JJ local). */
export function cleJour(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2h30" / "45 min" / "1h05" — duree en minutes -> libelle court. */
export function formatDuree(minutes: number): string {
  if (minutes < 1) return "moins d'une minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
