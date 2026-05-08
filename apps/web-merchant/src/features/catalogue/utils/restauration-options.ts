import type { NiveauEpice } from "../types/produit.type";

export const TAGS_CUISINE = [
  { id: "VEGAN", label: "Vegan" },
  { id: "VEGETARIEN", label: "Végétarien" },
  { id: "SANS_GLUTEN", label: "Sans gluten" },
  { id: "SANS_LACTOSE", label: "Sans lactose" },
  { id: "HALAL", label: "Halal" },
  { id: "CASHER", label: "Casher" },
  { id: "BIO", label: "Bio" },
  { id: "MAISON", label: "Fait maison" },
  { id: "NOUVEAU", label: "Nouveauté" },
  { id: "SIGNATURE", label: "Signature" },
] as const;

export const NIVEAUX_EPICE: { id: NiveauEpice; label: string; description: string }[] = [
  { id: "AU_CHOIX", label: "Au choix du client", description: "Le client peut commander épicé ou non." },
  { id: "TOUJOURS_EPICE", label: "Toujours épicé", description: "Le plat est toujours servi épicé." },
  { id: "JAMAIS_EPICE", label: "Jamais épicé", description: "Le plat n'est jamais épicé." },
];
