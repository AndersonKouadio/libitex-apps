import { z } from "zod";

export const fondParMethodeSchema = z.object({
  CASH: z.number().min(0, "Le fond espèces doit être positif").default(0),
  CARD: z.number().min(0).default(0).optional(),
  MOBILE_MONEY: z.number().min(0).default(0).optional(),
  BANK_TRANSFER: z.number().min(0).default(0).optional(),
});

export const ouvrirSessionSchema = z.object({
  emplacementId: z.string().uuid("Emplacement invalide"),
  fondInitial: fondParMethodeSchema,
  commentaire: z.string().max(500, "Commentaire trop long").optional(),
});

export const fermerSessionSchema = z.object({
  fondFinalDeclare: fondParMethodeSchema,
  commentaire: z.string().max(500, "Commentaire trop long").optional(),
});

export type OuvrirSessionInput = z.infer<typeof ouvrirSessionSchema>;
export type FermerSessionInput = z.infer<typeof fermerSessionSchema>;
