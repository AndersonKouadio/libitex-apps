import { z } from "zod";

export const SECTEURS_VALIDES = [
  "VETEMENT", "ALIMENTAIRE", "ELECTRONIQUE", "RESTAURATION", "BEAUTE_COSMETIQUE",
  "QUINCAILLERIE", "LIBRAIRIE", "PHARMACIE", "BIJOUTERIE", "AUTRE",
] as const;

export const connexionSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(6, "6 caractères minimum"),
});

export const inscriptionSchema = z.object({
  nomBoutique: z.string().min(2, "Nom de boutique requis"),
  slugBoutique: z.string().min(2, "Identifiant boutique requis"),
  adresseBoutique: z.string().optional(),
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(6, "6 caractères minimum"),
  prenom: z.string().min(1, "Prenom requis"),
  nomFamille: z.string().min(1, "Nom de famille requis"),
  telephone: z.string().optional(),
  devise: z.string().default("XOF"),
  secteurActivite: z.enum(SECTEURS_VALIDES).default("AUTRE"),
});

export const creerBoutiqueSchema = z.object({
  nomBoutique: z.string().min(2, "Nom de boutique requis"),
  slugBoutique: z.string().min(2, "Identifiant boutique requis"),
  adresseBoutique: z.string().optional(),
  devise: z.string().default("XOF"),
  secteurActivite: z.enum(SECTEURS_VALIDES),
});

export const changerMotDePasseSchema = z.object({
  motDePasseActuel: z.string().min(1, "Mot de passe actuel requis"),
  nouveauMotDePasse: z.string().min(8, "8 caractères minimum"),
  confirmation: z.string(),
}).refine(
  (data) => data.nouveauMotDePasse === data.confirmation,
  { message: "Les deux mots de passe ne correspondent pas", path: ["confirmation"] },
).refine(
  (data) => data.motDePasseActuel !== data.nouveauMotDePasse,
  { message: "Le nouveau mot de passe doit être différent de l'actuel", path: ["nouveauMotDePasse"] },
);

export const motDePasseOublieSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

export const reinitialiserMotDePasseSchema = z.object({
  token: z.string().min(1, "Lien invalide"),
  nouveauMotDePasse: z.string().min(8, "8 caractères minimum"),
  confirmation: z.string(),
}).refine(
  (d) => d.nouveauMotDePasse === d.confirmation,
  { message: "Les deux mots de passe ne correspondent pas", path: ["confirmation"] },
);

export type ConnexionDTO = z.infer<typeof connexionSchema>;
export type InscriptionDTO = z.infer<typeof inscriptionSchema>;
export type CreerBoutiqueDTO = z.infer<typeof creerBoutiqueSchema>;
export type ChangerMotDePasseDTO = z.infer<typeof changerMotDePasseSchema>;
export type MotDePasseOublieDTO = z.infer<typeof motDePasseOublieSchema>;
export type ReinitialiserMotDePasseDTO = z.infer<typeof reinitialiserMotDePasseSchema>;
