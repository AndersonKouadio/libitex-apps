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
 * Echappe une cellule CSV : si elle contient virgule, guillemet ou
 * saut de ligne, on l'entoure de guillemets et on double les
 * guillemets internes (RFC 4180).
 */
function echaperCellule(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Genere le CSV d'export du catalogue. Format compatible avec
 * l'import : meme headers, ordre des colonnes coherent, lignes au
 * format CRLF (Excel/Google Sheets). Utilise la premiere variante
 * (cas SIMPLE/MENU). Pour VARIANT, il faudra une route export
 * dediee qui denormalise une ligne par variante.
 */
export function produitsVersCsv(produits: ReadonlyArray<{
  nom: string;
  description?: string | null;
  marque?: string | null;
  tauxTva?: number | null;
  actif?: boolean;
  variantes?: Array<{
    sku?: string;
    codeBarres?: string | null;
    prixAchat?: number | null;
    prixDetail?: number;
    prixGros?: number | null;
    prixVip?: number | null;
  }>;
}>): string {
  const headers = [
    "nom", "sku", "prixDetail", "prixAchat", "prixGros", "prixVip",
    "marque", "description", "codeBarres", "tauxTva", "actif",
  ];
  const lignes = produits.map((p) => {
    const v = p.variantes?.[0];
    return [
      p.nom,
      v?.sku ?? "",
      v?.prixDetail ?? "",
      v?.prixAchat ?? "",
      v?.prixGros ?? "",
      v?.prixVip ?? "",
      p.marque ?? "",
      p.description ?? "",
      v?.codeBarres ?? "",
      p.tauxTva ?? "",
      p.actif === false ? "0" : "1",
    ].map(echaperCellule).join(",");
  });
  return [headers.join(","), ...lignes].join("\r\n");
}

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

// ─── Import generique (clients, fournisseurs, etc.) ───

/**
 * Definition d'un champ pour le mapping CSV generique :
 * - cle = nom interne du champ
 * - synonymes = headers CSV acceptes (insensible casse/espaces/tirets)
 * - obligatoire = bloque l'import si non mappe ou ligne vide
 */
export interface ChampDef {
  cle: string;
  libelle: string;
  synonymes: string[];
  obligatoire: boolean;
}

/**
 * Auto-mapping generique : pour chaque champ defini, cherche un header
 * compatible (normalise minuscules + sans espaces/tirets/underscores).
 * Retourne le mapping cle -> index header (ou null si pas trouve).
 */
export function autoMapperGeneric(
  headers: string[],
  champs: ChampDef[],
): Record<string, number | null> {
  const normaliser = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const map: Record<string, number | null> = {};
  for (const champ of champs) {
    const synos = champ.synonymes.map(normaliser);
    const idx = headers.findIndex((h) => synos.includes(normaliser(h)));
    map[champ.cle] = idx === -1 ? null : idx;
  }
  return map;
}

/**
 * Convertit une ligne CSV en payload typed selon les champs definis.
 * Les valeurs vides sont omises (undefined). Aucune coercion auto :
 * tout reste string. Le consommateur cast cote application.
 */
export function ligneVersObjet(
  ligne: string[],
  mapping: Record<string, number | null>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const cle of Object.keys(mapping)) {
    const idx = mapping[cle];
    if (idx === null) { out[cle] = undefined; continue; }
    const v = ligne[idx]?.trim();
    out[cle] = v && v.length > 0 ? v : undefined;
  }
  return out;
}

/**
 * Champs reconnus pour les imports clients (synonymes FR/EN courants).
 */
export const CHAMPS_CLIENT: ChampDef[] = [
  { cle: "prenom",     libelle: "Prénom",     synonymes: ["prenom", "prénom", "firstname", "first name", "first_name"], obligatoire: true },
  { cle: "nomFamille", libelle: "Nom",        synonymes: ["nom", "nomfamille", "nom famille", "lastname", "last name", "last_name", "surname"], obligatoire: false },
  { cle: "telephone",  libelle: "Téléphone",  synonymes: ["telephone", "téléphone", "tel", "phone", "mobile", "gsm", "portable"], obligatoire: false },
  { cle: "email",      libelle: "Email",      synonymes: ["email", "e-mail", "mail", "courriel"], obligatoire: false },
  { cle: "adresse",    libelle: "Adresse",    synonymes: ["adresse", "address", "addr"], obligatoire: false },
  { cle: "notes",      libelle: "Notes",      synonymes: ["notes", "note", "commentaire", "comments", "remarque"], obligatoire: false },
];

/**
 * Champs reconnus pour les imports fournisseurs (synonymes FR/EN courants).
 */
export const CHAMPS_FOURNISSEUR: ChampDef[] = [
  { cle: "nom",                libelle: "Nom",                synonymes: ["nom", "name", "raison sociale", "societe", "société", "company"], obligatoire: true },
  { cle: "nomContact",         libelle: "Contact",            synonymes: ["contact", "nomcontact", "nom contact", "interlocuteur", "responsable"], obligatoire: false },
  { cle: "telephone",          libelle: "Téléphone",          synonymes: ["telephone", "téléphone", "tel", "phone", "mobile"], obligatoire: false },
  { cle: "email",              libelle: "Email",              synonymes: ["email", "e-mail", "mail", "courriel"], obligatoire: false },
  { cle: "adresse",            libelle: "Adresse",            synonymes: ["adresse", "address", "addr"], obligatoire: false },
  { cle: "conditionsPaiement", libelle: "Conditions paiement", synonymes: ["conditionspaiement", "conditions paiement", "conditions", "paiement", "terms"], obligatoire: false },
  { cle: "notes",              libelle: "Notes",              synonymes: ["notes", "note", "commentaire", "comments"], obligatoire: false },
];
