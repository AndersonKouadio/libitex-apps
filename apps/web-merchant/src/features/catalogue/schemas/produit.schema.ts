import { z } from "zod";

export const creerVarianteSchema = z.object({
  sku: z.string().min(1, "SKU requis"),
  nom: z.string().optional(),
  attributs: z.record(z.string(), z.string()).optional(),
  codeBarres: z.string().optional(),
  prixAchat: z.number().min(0).optional(),
  prixDetail: z.number().min(0, "Prix de detail requis"),
  prixGros: z.number().min(0).optional(),
  prixVip: z.number().min(0).optional(),
});

export const creerProduitSchema = z.object({
  nom: z.string().min(2, "Nom du produit requis (2 caracteres min.)"),
  description: z.string().optional(),
  typeProduit: z.enum(["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE"]),
  categorieId: z.string().optional(),
  marque: z.string().optional(),
  codeBarresEan13: z.string().optional(),
  tauxTva: z.number().min(0).optional(),
  variantes: z.array(creerVarianteSchema).min(1, "Au moins une variante requise"),
});

export type CreerProduitDTO = z.infer<typeof creerProduitSchema>;
export type CreerVarianteDTO = z.infer<typeof creerVarianteSchema>;
