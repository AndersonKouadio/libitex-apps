import type { SecteurActivite, TypeProduit } from "../types/auth.type";

export const SECTEUR_LABELS: Record<SecteurActivite, string> = {
  VETEMENT: "Vetement & mode",
  ALIMENTAIRE: "Alimentaire & marche",
  ELECTRONIQUE: "Electronique & telephonie",
  RESTAURATION: "Restauration",
  BEAUTE_COSMETIQUE: "Beaute & cosmetique",
  QUINCAILLERIE: "Quincaillerie & bricolage",
  LIBRAIRIE: "Librairie & papeterie",
  PHARMACIE: "Pharmacie & parapharmacie",
  BIJOUTERIE: "Bijouterie & accessoires",
  AUTRE: "Autre / multi-activites",
};

export const SECTEUR_TYPES_PRODUITS: Record<SecteurActivite, TypeProduit[]> = {
  VETEMENT: ["SIMPLE", "VARIANT"],
  ALIMENTAIRE: ["SIMPLE", "PERISHABLE"],
  ELECTRONIQUE: ["SIMPLE", "VARIANT", "SERIALIZED"],
  RESTAURATION: ["SIMPLE", "PERISHABLE"],
  BEAUTE_COSMETIQUE: ["SIMPLE", "VARIANT", "PERISHABLE"],
  QUINCAILLERIE: ["SIMPLE", "VARIANT"],
  LIBRAIRIE: ["SIMPLE"],
  PHARMACIE: ["SIMPLE", "PERISHABLE", "SERIALIZED"],
  BIJOUTERIE: ["SIMPLE", "VARIANT", "SERIALIZED"],
  AUTRE: ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE"],
};

export const TYPE_PRODUIT_LABELS: Record<TypeProduit, string> = {
  SIMPLE: "Standard",
  VARIANT: "Avec variantes",
  SERIALIZED: "Sérialisé",
  PERISHABLE: "Périssable",
};

export const SECTEURS_ORDONNES: SecteurActivite[] = [
  "VETEMENT",
  "ALIMENTAIRE",
  "ELECTRONIQUE",
  "RESTAURATION",
  "BEAUTE_COSMETIQUE",
  "QUINCAILLERIE",
  "LIBRAIRIE",
  "PHARMACIE",
  "BIJOUTERIE",
  "AUTRE",
];
