import { z } from "zod";

export const creerClientSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nomFamille: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Adresse email invalide").optional().or(z.literal("")),
  adresse: z.string().optional(),
  notes: z.string().optional(),
});

export type CreerClientDTO = z.infer<typeof creerClientSchema>;
