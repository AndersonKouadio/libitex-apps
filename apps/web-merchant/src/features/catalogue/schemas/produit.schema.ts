import { z } from "zod";
import { UniteMesure } from "@/features/unite/types/unite.type";

export const creerVarianteSchema = z.object({
  sku: z.string().min(1, "SKU requis"),
  nom: z.string().optional(),
  attributs: z.record(z.string(), z.string()).optional(),
  codeBarres: z.string().optional(),
  prixAchat: z.number().min(0).optional(),
  prixDetail: z.number().min(0, "Prix de détail requis"),
  prixGros: z.number().min(0).optional(),
  prixVip: z.number().min(0).optional(),
  uniteVente: z.nativeEnum(UniteMesure).optional(),
  pasMin: z.number().min(0, "Pas minimum invalide").optional(),
  prixParUnite: z.boolean().optional(),
});

export const creerProduitSchema = z.object({
  nom: z.string().min(2, "Nom du produit requis (2 caractères min.)"),
  description: z.string().optional(),
  typeProduit: z.enum(["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE", "MENU"]),
  categorieId: z.string().optional(),
  marque: z.string().optional(),
  codeBarresEan13: z.string().optional(),
  tauxTva: z.number().min(0).optional(),
  images: z.array(z.string().url("URL d'image invalide")).max(6, "6 images maximum").optional(),
  metadataSecteur: z.record(z.string(), z.unknown()).optional(),
  variantes: z.array(creerVarianteSchema).min(1, "Au moins une variante requise"),
});

export const modifierProduitSchema = z.object({
  nom: z.string().min(2, "Nom du produit requis (2 caractères min.)").optional(),
  description: z.string().optional(),
  marque: z.string().optional(),
  categorieId: z.string().optional(),
  images: z.array(z.string().url("URL d'image invalide")).max(6, "6 images maximum").optional(),
  metadataSecteur: z.record(z.string(), z.unknown()).optional(),
  actif: z.boolean().optional(),
});

export type CreerProduitDTO = z.infer<typeof creerProduitSchema>;
export type CreerVarianteDTO = z.infer<typeof creerVarianteSchema>;
export type ModifierProduitDTO = z.infer<typeof modifierProduitSchema>;
