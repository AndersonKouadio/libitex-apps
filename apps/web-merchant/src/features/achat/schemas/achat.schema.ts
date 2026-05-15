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
  /** Phase A.5 : devise commande (defaut XOF). */
  devise: z.string().min(3).max(3).optional(),
  /** Phase A.5 : taux de change devise -> XOF, fige a la creation (defaut 1.0). */
  tauxChange: z.coerce.number().positive("Taux > 0 requis").optional(),
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

// ─── Phase A.2 : Frais d'approche (Landed Cost) ───

const CATEGORIES_FRAIS_TUPLE = [
  "TRANSPORT",
  "CUSTOMS",
  "TRANSIT",
  "INSURANCE",
  "HANDLING",
  "OTHER",
] as const;

const DEVISES_FREQUENTES_TUPLE = [
  "XOF", "EUR", "USD", "CNY", "GBP", "MAD", "GHS", "NGN",
] as const;

export const fraisSchema = z.object({
  categorie: z.enum(CATEGORIES_FRAIS_TUPLE),
  libelle: z.string().min(1, "Libelle requis").max(255, "Libelle trop long"),
  montant: z.coerce.number().nonnegative("Montant invalide"),
  devise: z.string().min(3, "Devise requise (ex: XOF)").max(3, "Code ISO 3 lettres"),
  tauxChange: z.coerce.number().positive("Taux > 0 requis"),
  notes: z.string().max(500, "Notes : 500 caracteres maximum").optional(),
});

export type FraisDTO = z.infer<typeof fraisSchema>;

/** Liste des devises proposees dans le Select (saisie libre 3 lettres acceptee aussi). */
export const DEVISES_FREQUENTES: readonly string[] = DEVISES_FREQUENTES_TUPLE;
