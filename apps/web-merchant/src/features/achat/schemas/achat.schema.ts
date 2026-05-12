import { z } from "zod";

/** Fix m6 : limite raisonnable pour les notes (500 caracteres = ~80 mots). */
const MAX_LONGUEUR_NOTES = 500;

export const fournisseurSchema = z.object({
  nom: z.string().min(1, "Nom requis").max(255),
  nomContact: z.string().max(255).optional(),
  telephone: z.string().max(50).optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  adresse: z.string().max(500).optional(),
  conditionsPaiement: z.string().max(255).optional(),
  notes: z.string().max(MAX_LONGUEUR_NOTES, `Notes : 500 caracteres maximum`).optional(),
});

export type FournisseurDTO = z.infer<typeof fournisseurSchema>;

export const ligneCommandeSchema = z.object({
  varianteId: z.string().uuid(),
  quantite: z.number().positive("Quantite > 0 requise"),
  prixUnitaire: z.number().nonnegative("Prix invalide"),
});

/** Aujourd'hui en YYYY-MM-DD pour comparaisons string-safe. */
function aujourdhuiISO(): string {
  return new Date().toISOString().split("T")[0]!;
}

export const commandeSchema = z.object({
  fournisseurId: z.string().uuid("Fournisseur requis"),
  emplacementId: z.string().uuid("Emplacement requis"),
  // Fix m5 : la date de livraison attendue ne peut pas etre dans le passe.
  // Comparaison string YYYY-MM-DD (ISO lexicographique), pas besoin de Date.
  dateAttendue: z.string()
    .refine((d) => !d || d >= aujourdhuiISO(), "La date de livraison ne peut pas etre dans le passe")
    .optional(),
  notes: z.string().max(MAX_LONGUEUR_NOTES, `Notes : 500 caracteres maximum`).optional(),
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
