import { z } from "zod";

export const entreeStockSchema = z.object({
  varianteId: z.string().min(1, "Selectionnez un produit"),
  emplacementId: z.string().min(1, "Selectionnez un emplacement"),
  quantite: z.number().min(1, "La quantite doit etre au moins 1"),
  note: z.string().optional(),
});

export type EntreeStockDTO = z.infer<typeof entreeStockSchema>;
