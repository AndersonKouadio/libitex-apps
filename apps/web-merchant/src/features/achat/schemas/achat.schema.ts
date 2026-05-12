import { z } from "zod";

export const fournisseurSchema = z.object({
  nom: z.string().min(1, "Nom requis").max(255),
  nomContact: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  adresse: z.string().optional(),
  conditionsPaiement: z.string().optional(),
  notes: z.string().optional(),
});

export type FournisseurDTO = z.infer<typeof fournisseurSchema>;

export const ligneCommandeSchema = z.object({
  varianteId: z.string().uuid(),
  quantite: z.number().positive("Quantite > 0 requise"),
  prixUnitaire: z.number().nonnegative("Prix invalide"),
});

export const commandeSchema = z.object({
  fournisseurId: z.string().uuid("Fournisseur requis"),
  emplacementId: z.string().uuid("Emplacement requis"),
  dateAttendue: z.string().optional(),
  notes: z.string().optional(),
  lignes: z.array(ligneCommandeSchema).min(1, "Ajoutez au moins une ligne"),
});

export type CommandeDTO = z.infer<typeof commandeSchema>;

export const receptionSchema = z.object({
  lignes: z.array(z.object({
    ligneId: z.string().uuid(),
    quantite: z.number().nonnegative(),
  })),
  majPrixAchat: z.boolean().optional(),
});

export type ReceptionDTO = z.infer<typeof receptionSchema>;
