import { z } from "zod";

export const creerClientSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nomFamille: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Adresse email invalide").optional().or(z.literal("")),
  adresse: z.string().optional(),
  notes: z.string().optional(),
  /** Module 10 D2 : opt-in WhatsApp. Default true cote backend. */
  whatsappOptIn: z.boolean().optional(),
});

export type CreerClientDTO = z.infer<typeof creerClientSchema>;
