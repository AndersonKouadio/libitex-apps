export interface IBoutiquePublic {
  id: string;
  slug: string;
  nom: string;
  secteur: string;
  devise: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  logoUrl: string | null;
}

export interface IVariantePublic {
  id: string;
  sku: string;
  nom: string | null;
  prixDetail: number;
  prixPromotion: number | null;
}

export interface IProduitPublic {
  id: string;
  nom: string;
  description: string | null;
  marque: string | null;
  categorieId: string | null;
  images: string[];
  enPromotion: boolean;
  prixPromotion: number | null;
  enRupture: boolean;
  variantes: IVariantePublic[];
}

export interface ICategoriePublique {
  id: string;
  nom: string;
  slug: string;
}
