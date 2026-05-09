export type CategorieSupplement =
  | "NOURRITURE" | "BOISSON" | "SAUCE" | "ACCESSOIRE" | "AUTRE";

export const CATEGORIES_SUPPLEMENT: CategorieSupplement[] = [
  "NOURRITURE", "BOISSON", "SAUCE", "ACCESSOIRE", "AUTRE",
];

export const LABELS_CATEGORIE_SUPPLEMENT: Record<CategorieSupplement, string> = {
  NOURRITURE: "Nourriture",
  BOISSON: "Boisson",
  SAUCE: "Sauce",
  ACCESSOIRE: "Accessoire",
  AUTRE: "Autre",
};

export interface ISupplement {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  categorie: CategorieSupplement;
  image: string | null;
  actif: boolean;
  creeLe: string;
}
