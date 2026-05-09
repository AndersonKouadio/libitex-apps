import { z } from "zod";

export const supplementChoisiSchema = z.object({
  supplementId: z.string().min(1),
  quantite: z.number().int().positive(),
});

export const ligneTicketSchema = z.object({
  varianteId: z.string().min(1, "Article requis"),
  quantite: z.number().positive("Quantité invalide"),
  remise: z.number().min(0).optional(),
  numeroSerie: z.string().optional(),
  supplements: z.array(supplementChoisiSchema).optional(),
});

export const creerTicketSchema = z.object({
  emplacementId: z.string().min(1, "Emplacement requis"),
  remiseGlobale: z.number().min(0).optional(),
  raisonRemise: z.string().optional(),
  lignes: z.array(ligneTicketSchema).min(1, "Au moins un article est requis"),
  nomClient: z.string().optional(),
  telephoneClient: z.string().optional(),
});

export const paiementSchema = z.object({
  methode: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT"]),
  montant: z.number().positive("Montant invalide"),
  reference: z.string().optional(),
});

export const completerTicketSchema = z.object({
  paiements: z.array(paiementSchema).min(1, "Au moins un paiement est requis"),
});

export type LigneTicketDTO = z.infer<typeof ligneTicketSchema>;
export type CreerTicketDTO = z.infer<typeof creerTicketSchema>;
export type PaiementDTO = z.infer<typeof paiementSchema>;
export type CompleterTicketDTO = z.infer<typeof completerTicketSchema>;
