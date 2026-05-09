import type { UniteMesure } from "@/features/unite/types/unite.type";

export enum TypeProduit {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
  MENU = "MENU",
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

export type NiveauEpice = "TOUJOURS_EPICE" | "JAMAIS_EPICE" | "AU_CHOIX";

export type ModeDisponibilite = "TOUJOURS" | "PROGRAMME";

export interface PlageHoraire {
  from: string; // "HH:MM"
  to: string;
}

export type PlanningDisponibilite = Record<string, PlageHoraire[]>;

export interface IProduit {
  id: string;
  nom: string;
  description: string | null;
  typeProduit: TypeProduit;
  marque: string | null;
  categorieId: string | null;
  tauxTva: number;
  images: string[];
  metadataSecteur: Record<string, unknown>;
  // Restauration
  cookingTimeMinutes: number | null;
  prixPromotion: number | null;
  enPromotion: boolean;
  niveauEpice: NiveauEpice | null;
  tagsCuisine: string[];
  enRupture: boolean;
  // Disponibilite
  modeDisponibilite: ModeDisponibilite;
  planningDisponibilite: PlanningDisponibilite;
  emplacementsDisponibles: string[];
  // Communs
  actif: boolean;
  isSupplement: boolean;
  variantes: IVariante[];
  creeLe: string;
}

export interface ICategorie {
  id: string;
  nom: string;
  slug: string;
  parentId: string | null;
  /** Nombre de produits actifs rattaches a cette categorie (lecture seule). */
  nombreProduits?: number;
}
