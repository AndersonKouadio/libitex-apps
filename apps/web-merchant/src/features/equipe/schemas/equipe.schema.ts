import { z } from "zod";

export const ROLES_VALIDES = ["ADMIN", "MANAGER", "COMMERCIAL", "CASHIER", "WAREHOUSE"] as const;

export const inviterMembreSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  prenom: z.string().min(1, "Prénom requis"),
  nomFamille: z.string().min(1, "Nom requis"),
  telephone: z.string().optional(),
  role: z.enum(ROLES_VALIDES),
  accessAllLocations: z.boolean(),
  locationIds: z.array(z.string()).optional(),
}).refine(
  (data) => data.accessAllLocations || (data.locationIds && data.locationIds.length > 0),
  { message: "Sélectionnez au moins un emplacement", path: ["locationIds"] },
);

export const modifierMembreSchema = z.object({
  role: z.enum(ROLES_VALIDES).optional(),
  accessAllLocations: z.boolean().optional(),
  locationIds: z.array(z.string()).optional(),
});

export type InviterMembreDTO = z.infer<typeof inviterMembreSchema>;
export type ModifierMembreDTO = z.infer<typeof modifierMembreSchema>;
