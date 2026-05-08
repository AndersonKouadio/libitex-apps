import type { UniteMesure } from "@/features/unite/types/unite.type";

export enum TypeProduit {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
}

export interface IVariante {
  id: string;
  sku: string;
  nom: string | null;
  attributs: Record<string, string>;
  codeBarres: string | null;
  prixAchat: number;
  prixDetail: number;
  prixGros: number | null;
  prixVip: number | null;
  uniteVente: UniteMesure;
  /** Pas minimum a la saisie au POS. Null = entiers seulement. */
  pasMin: number | null;
  /** Vrai si le prix est au kg/metre/litre, faux si forfaitaire a la piece/lot. */
  prixParUnite: boolean;
}

export interface IProduit {
  id: string;
  nom: string;
  description: string | null;
  typeProduit: TypeProduit;
  marque: string | null;
  categorieId: string | null;
  tauxTva: number;
  images: string[];
  actif: boolean;
  variantes: IVariante[];
  creeLe: string;
}

export interface ICategorie {
  id: string;
  nom: string;
  slug: string;
  parentId: string | null;
}
