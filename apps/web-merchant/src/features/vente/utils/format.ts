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
