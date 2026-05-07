import { z } from "zod";

export const UNITES_VALIDES = ["G", "KG", "ML", "L", "PIECE"] as const;

export const creerIngredientSchema = z.object({
  nom: z.string().min(2, "Nom requis (2 caractères min.)"),
  description: z.string().optional(),
  unite: z.enum(UNITES_VALIDES),
  prixUnitaire: z.number().min(0, "Prix invalide").optional(),
  seuilAlerte: z.number().min(0, "Seuil invalide").optional(),
});

export const entreeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Sélectionnez un ingrédient"),
  emplacementId: z.string().min(1, "Sélectionnez un emplacement"),
  quantite: z.number().min(0.001, "La quantité doit être supérieure à 0"),
  unite: z.enum(UNITES_VALIDES).optional(),
  coutTotal: z.number().min(0).optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const ajustementIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  emplacementId: z.string().min(1),
  quantiteReelle: z.number().min(0, "Quantité invalide"),
  note: z.string().optional(),
});

export const ligneRecetteSchema = z.object({
  ingredientId: z.string().min(1),
  quantite: z.number().min(0.001, "Quantité requise"),
  unite: z.enum(UNITES_VALIDES),
});

export const definirRecetteSchema = z.object({
  lignes: z.array(ligneRecetteSchema).min(1, "Ajoutez au moins un ingrédient"),
});

export type CreerIngredientDTO = z.infer<typeof creerIngredientSchema>;
export type EntreeIngredientDTO = z.infer<typeof entreeIngredientSchema>;
export type AjustementIngredientDTO = z.infer<typeof ajustementIngredientSchema>;
export type LigneRecetteDTO = z.infer<typeof ligneRecetteSchema>;
export type DefinirRecetteDTO = z.infer<typeof definirRecetteSchema>;
