import { z } from "zod";

export const categorieSupplementSchema = z.enum([
  "NOURRITURE", "BOISSON", "SAUCE", "ACCESSOIRE", "AUTRE",
]);

export const creerSupplementSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
  prix: z.number().min(0, "Prix invalide"),
  categorie: categorieSupplementSchema,
  image: z.string().url("URL d'image invalide").optional(),
});

export const modifierSupplementSchema = creerSupplementSchema.partial().extend({
  actif: z.boolean().optional(),
});

export type CreerSupplementDTO = z.infer<typeof creerSupplementSchema>;
export type ModifierSupplementDTO = z.infer<typeof modifierSupplementSchema>;
