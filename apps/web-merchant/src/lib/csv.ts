/**
 * Parser CSV minimal sans dependance externe. Suffisant pour l'import
 * catalogue : separateur virgule, guillemets pour les valeurs contenant
 * une virgule, gestion BOM UTF-8. Pas de support multiline-in-quotes
 * (rarement present dans les exports Excel commerce).
 */

export interface CsvParsed {
  headers: string[];
  lignes: string[][];
}

export function parserCsv(texte: string): CsvParsed {
  // Retire le BOM si present (Excel ajoute ﻿ en debut quand on
  // sauvegarde "CSV UTF-8")
  const sansBom = texte.charCodeAt(0) === 0xFEFF ? texte.slice(1) : texte;
  const lignesBrutes = sansBom
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lignesBrutes.length === 0) {
    return { headers: [], lignes: [] };
  }

  const decouper = (ligne: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let dansGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (c === '"') {
        // "" -> guillemet litteral
        if (dansGuillemets && ligne[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          dansGuillemets = !dansGuillemets;
        }
      } else if (c === "," && !dansGuillemets) {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };

  const headers = decouper(lignesBrutes[0]).map((h) => h.toLowerCase());
  const lignes = lignesBrutes.slice(1).map(decouper);
  return { headers, lignes };
}

/**
 * Champs produit reconnus (cle = nom interne, valeurs = synonymes acceptes
 * dans le header CSV). Permet l'auto-mapping insensible a la casse et aux
 * variations courantes (FR/EN, espaces, tirets).
 */
/**
 * Champs supportes par l'import CSV (MVP). La categorie n'est pas
 * incluse : la mise en categorie se fait apres import (edition produit
 * ou actions en masse). Cela evite la creation accidentelle de
 * doublons de categories sur fautes de frappe.
 */
export const CHAMPS_PRODUIT = {
  nom: ["nom", "name", "produit", "designation"],
  description: ["description", "desc"],
  marque: ["marque", "brand", "fabricant"],
  sku: ["sku", "reference", "ref", "code"],
  codeBarres: ["codebarres", "code-barres", "code_barres", "barcode", "ean", "gtin"],
  prixDetail: ["prixdetail", "prix detail", "prix_detail", "prix", "price", "prix vente", "prix unitaire"],
  prixAchat: ["prixachat", "prix achat", "prix_achat", "purchase", "cout"],
  prixGros: ["prixgros", "prix gros", "prix_gros", "wholesale"],
  prixVip: ["prixvip", "prix vip", "prix_vip", "vip"],
  tauxTva: ["tva", "tauxtva", "taux tva", "vat", "tax"],
} as const;

/**
 * Convertit une ligne CSV (array de cellules) + un mapping
 * (champ -> index colonne) en payload CreerProduitDTO partiel.
 * Les valeurs vides sont omises pour laisser les defauts Zod jouer.
 */
export function ligneVersProduit(
  ligne: string[],
  mapping: Record<ChampProduit, number | null>,
): Record<string, unknown> {
  const valeur = (champ: ChampProduit): string | undefined => {
    const idx = mapping[champ];
    if (idx === null) return undefined;
    const v = ligne[idx]?.trim();
    return v && v.length > 0 ? v : undefined;
  };
  const num = (s: string | undefined) => (s !== undefined ? Number(s.replace(/\s/g, "").replace(",", ".")) : undefined);

  const sku = valeur("sku");
  const prixDetail = num(valeur("prixDetail"));

  return {
    nom: valeur("nom"),
    description: valeur("description"),
    typeProduit: "SIMPLE",
    marque: valeur("marque"),
    tauxTva: num(valeur("tauxTva")),
    variantes: [{
      sku: sku ?? "",
      prixDetail: prixDetail ?? 0,
      prixAchat: num(valeur("prixAchat")),
      prixGros: num(valeur("prixGros")),
      prixVip: num(valeur("prixVip")),
      codeBarres: valeur("codeBarres"),
    }],
  };
}

export type ChampProduit = keyof typeof CHAMPS_PRODUIT;

export function autoMapper(headers: string[]): Record<ChampProduit, number | null> {
  const normaliser = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const map = {} as Record<ChampProduit, number | null>;
  for (const champ of Object.keys(CHAMPS_PRODUIT) as ChampProduit[]) {
    const synonymes = CHAMPS_PRODUIT[champ].map(normaliser);
    map[champ] = headers.findIndex((h) => synonymes.includes(normaliser(h)));
    if (map[champ] === -1) map[champ] = null;
  }
  return map;
}
