import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Unite de mesure partagee entre le catalogue (uniteVente sur variants)
 * et la restauration (unite des ingredients, recettes). Les valeurs doivent
 * rester synchronisees avec l'enum TypeScript UniteMesure dans @libitex/shared.
 */
export const uniteMesureEnum = pgEnum("unite_mesure", [
  // Poids
  "G",
  "KG",
  // Volume
  "ML",
  "L",
  // Longueur
  "CM",
  "M",
  // Unitaire / dénombrable
  "PIECE",
  "DOUZAINE",
  "LOT",
]);
