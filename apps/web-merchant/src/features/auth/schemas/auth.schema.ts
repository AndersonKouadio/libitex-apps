import { z } from "zod";

export const SECTEURS_VALIDES = [
  "VETEMENT", "ALIMENTAIRE", "ELECTRONIQUE", "RESTAURATION", "BEAUTE_COSMETIQUE",
  "QUINCAILLERIE", "LIBRAIRIE", "PHARMACIE", "BIJOUTERIE", "AUTRE",
] as const;

export const connexionSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(6, "6 caracteres minimum"),
});

export const inscriptionSchema = z.object({
  nomBoutique: z.string().min(2, "Nom de boutique requis"),
  slugBoutique: z.string().min(2, "Identifiant boutique requis"),
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(6, "6 caracteres minimum"),
  prenom: z.string().min(1, "Prenom requis"),
  nomFamille: z.string().min(1, "Nom de famille requis"),
  telephone: z.string().optional(),
  devise: z.string().default("XOF"),
  secteurActivite: z.enum(SECTEURS_VALIDES).default("AUTRE"),
});

export const creerBoutiqueSchema = z.object({
  nomBoutique: z.string().min(2, "Nom de boutique requis"),
  slugBoutique: z.string().min(2, "Identifiant boutique requis"),
  devise: z.string().default("XOF"),
  secteurActivite: z.enum(SECTEURS_VALIDES),
});

export type ConnexionDTO = z.infer<typeof connexionSchema>;
export type InscriptionDTO = z.infer<typeof inscriptionSchema>;
export type CreerBoutiqueDTO = z.infer<typeof creerBoutiqueSchema>;
