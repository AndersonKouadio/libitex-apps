import type { IProduit, PlageHoraire } from "../types/produit.type";

const JOURS_INDEX: Record<number, string> = {
  0: "dimanche",
  1: "lundi",
  2: "mardi",
  3: "mercredi",
  4: "jeudi",
  5: "vendredi",
  6: "samedi",
};

function dansLaPlage(heureCourante: string, plage: PlageHoraire): boolean {
  return heureCourante >= plage.from && heureCourante <= plage.to;
}

/**
 * Indique si un produit est vendable a l'instant donne, sur l'emplacement donne.
 * Retourne false si :
 *  - le produit est marque enRupture
 *  - mode=PROGRAMME et l'heure courante n'est dans aucune plage du jour
 *  - emplacementsDisponibles non vide et n'inclut pas l'emplacement courant
 */
export function estDisponibleMaintenant(
  produit: IProduit,
  emplacementId: string,
  maintenant: Date = new Date(),
): boolean {
  if (produit.enRupture) return false;

  // Filtre emplacement
  if (produit.emplacementsDisponibles && produit.emplacementsDisponibles.length > 0) {
    if (!produit.emplacementsDisponibles.includes(emplacementId)) return false;
  }

  // Filtre temporel
  if (produit.modeDisponibilite === "PROGRAMME") {
    const jour = JOURS_INDEX[maintenant.getDay()];
    const plages = jour ? (produit.planningDisponibilite?.[jour] ?? []) : [];
    if (plages.length === 0) return false;
    const heure = `${String(maintenant.getHours()).padStart(2, "0")}:${String(maintenant.getMinutes()).padStart(2, "0")}`;
    return plages.some((p) => dansLaPlage(heure, p));
  }

  return true;
}
