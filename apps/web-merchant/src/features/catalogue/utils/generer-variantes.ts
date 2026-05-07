import type { CreerVarianteDTO } from "../schemas/produit.schema";

export interface AxeAttribut {
  nom: string;
  valeurs: string[];
}

export function genererVariantesParCombinaison(
  axes: AxeAttribut[],
  prefixeSku: string,
  prixDetail: number,
): CreerVarianteDTO[] {
  const axesValides = axes.filter((a) => a.nom.trim() && a.valeurs.length > 0);
  if (axesValides.length === 0) return [];

  const combinaisons: Array<Record<string, string>> = [{}];
  for (const axe of axesValides) {
    const nouvelles: Array<Record<string, string>> = [];
    for (const combinaisonExistante of combinaisons) {
      for (const valeur of axe.valeurs) {
        nouvelles.push({ ...combinaisonExistante, [axe.nom.trim()]: valeur });
      }
    }
    combinaisons.length = 0;
    combinaisons.push(...nouvelles);
  }

  return combinaisons.map((attributs, i) => ({
    sku: prefixeSku ? `${prefixeSku}-${(i + 1).toString().padStart(2, "0")}` : "",
    nom: Object.values(attributs).join(" / "),
    attributs,
    prixDetail,
  }));
}

export function slugSku(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 12);
}
