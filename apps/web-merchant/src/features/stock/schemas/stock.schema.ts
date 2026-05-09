import { z } from "zod";

export const entreeStockSchema = z.object({
  varianteId: z.string().min(1, "Sélectionnez un produit"),
  emplacementId: z.string().min(1, "Sélectionnez un emplacement"),
  quantite: z.number().min(1, "La quantité doit etre au moins 1"),
  note: z.string().optional(),
  numeroLot: z.string().optional(),
  dateExpiration: z.string().optional(),
});

export const transfertStockSchema = z.object({
  varianteId: z.string().min(1, "Sélectionnez un produit"),
  depuisEmplacementId: z.string().min(1, "Emplacement de depart requis"),
  versEmplacementId: z.string().min(1, "Emplacement de destination requis"),
  quantite: z.number().min(1, "La quantité doit etre au moins 1"),
  note: z.string().optional(),
}).refine(
  (data) => data.depuisEmplacementId !== data.versEmplacementId,
  { message: "Les emplacements de depart et destination doivent differer", path: ["versEmplacementId"] },
);

export const ajustementStockSchema = z.object({
  varianteId: z.string().min(1, "Sélectionnez un produit"),
  emplacementId: z.string().min(1, "Sélectionnez un emplacement"),
  // Delta : positif (ajout) ou negatif (retrait). Le frontend calcule
  // ce delta a partir de la quantite reelle saisie - le stock actuel.
  quantite: z.number().refine((n) => n !== 0, "Aucun écart à ajuster"),
  note: z.string().min(1, "La justification est obligatoire"),
});

export type EntreeStockDTO = z.infer<typeof entreeStockSchema>;
export type TransfertStockDTO = z.infer<typeof transfertStockSchema>;
export type AjustementStockDTO = z.infer<typeof ajustementStockSchema>;
