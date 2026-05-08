import type { TypeProduit } from "../hooks/useFormProduit";

const TYPE_PREFIX: Record<TypeProduit, string> = {
  SIMPLE: "STD",
  VARIANT: "VAR",
  SERIALIZED: "SER",
  PERISHABLE: "PRS",
  MENU: "MNU",
};

function slugifier(nom: string): string {
  return nom
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
}

/**
 * Genere un SKU lisible et unique a partir du nom du produit et du type.
 * Format : `{PREFIXE_TYPE}-{NOM_SLUG}-{ALEA4}` ex. `STD-TACOS-A3F2`.
 *
 * Le SKU reste editable manuellement par l'utilisateur, c'est juste une
 * suggestion pour eviter la double saisie.
 */
export function genererSku(nom: string, typeProduit: TypeProduit): string {
  const slug = slugifier(nom);
  const alea = Math.random().toString(36).slice(2, 6).toUpperCase();
  return [TYPE_PREFIX[typeProduit], slug, alea].filter(Boolean).join("-");
}

/**
 * Genere un prefixe SKU pour une grappe de variantes (mode VARIANT).
 * Format : `{PREFIXE_TYPE}-{NOM_SLUG}` — les variantes y ajouteront leur suffixe.
 */
export function genererPrefixeSku(nom: string): string {
  const slug = slugifier(nom);
  return ["VAR", slug].filter(Boolean).join("-");
}
