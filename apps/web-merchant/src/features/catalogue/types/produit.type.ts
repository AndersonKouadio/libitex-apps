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
