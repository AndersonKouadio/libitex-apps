// ─── Enums ───

export enum ProductType {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
  MENU = "MENU",
}

/**
 * Unite de mesure utilisee a la fois par le catalogue (vente d'un produit
 * au poids/volume/longueur ou a l'unite) et par la restauration (ingredients,
 * recettes). Couvre les 4 categories : POIDS, VOLUME, LONGUEUR, UNITAIRE.
 */
export enum UniteMesure {
  // Poids
  G = "G",
  KG = "KG",
  // Volume
  ML = "ML",
  L = "L",
  // Longueur
  CM = "CM",
  M = "M",
  // Unitaire / dénombrable
  PIECE = "PIECE",
  DOUZAINE = "DOUZAINE",
  LOT = "LOT",
}

export enum UniteCategorie {
  POIDS = "POIDS",
  VOLUME = "VOLUME",
  LONGUEUR = "LONGUEUR",
  UNITAIRE = "UNITAIRE",
}

export enum StockMovementType {
  STOCK_IN = "STOCK_IN",
  STOCK_OUT = "STOCK_OUT",
  TRANSFER_OUT = "TRANSFER_OUT",
  TRANSFER_IN = "TRANSFER_IN",
  ADJUSTMENT = "ADJUSTMENT",
  RETURN_IN = "RETURN_IN",
  DEFECTIVE_OUT = "DEFECTIVE_OUT",
  WRITE_OFF = "WRITE_OFF",
}

export enum SerialStatus {
  IN_STOCK = "IN_STOCK",
  SOLD = "SOLD",
  RETURNED = "RETURNED",
  DEFECTIVE = "DEFECTIVE",
}

export enum OrderStatus {
  DRAFT = "DRAFT",
  CONFIRMED = "CONFIRMED",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  RECEIVED = "RECEIVED",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

export enum SaleStatus {
  DRAFT = "DRAFT",
  QUOTE = "QUOTE",
  PROFORMA = "PROFORMA",
  DELIVERY_NOTE = "DELIVERY_NOTE",
  INVOICED = "INVOICED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CREDIT = "CREDIT",
}

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  COMMERCIAL = "COMMERCIAL",
  CASHIER = "CASHIER",
  WAREHOUSE = "WAREHOUSE",
}

export enum ActivitySector {
  VETEMENT = "VETEMENT",
  ALIMENTAIRE = "ALIMENTAIRE",
  ELECTRONIQUE = "ELECTRONIQUE",
  RESTAURATION = "RESTAURATION",
  BEAUTE_COSMETIQUE = "BEAUTE_COSMETIQUE",
  QUINCAILLERIE = "QUINCAILLERIE",
  LIBRAIRIE = "LIBRAIRIE",
  PHARMACIE = "PHARMACIE",
  BIJOUTERIE = "BIJOUTERIE",
  AUTRE = "AUTRE",
}

export const ACTIVITY_SECTOR_LABELS: Record<ActivitySector, string> = {
  [ActivitySector.VETEMENT]: "Vetement & mode",
  [ActivitySector.ALIMENTAIRE]: "Alimentaire & marche",
  [ActivitySector.ELECTRONIQUE]: "Electronique & telephonie",
  [ActivitySector.RESTAURATION]: "Restauration",
  [ActivitySector.BEAUTE_COSMETIQUE]: "Beaute & cosmetique",
  [ActivitySector.QUINCAILLERIE]: "Quincaillerie & bricolage",
  [ActivitySector.LIBRAIRIE]: "Librairie & papeterie",
  [ActivitySector.PHARMACIE]: "Pharmacie & parapharmacie",
  [ActivitySector.BIJOUTERIE]: "Bijouterie & accessoires",
  [ActivitySector.AUTRE]: "Autre / multi-activites",
};

export const ACTIVITY_SECTOR_PRODUCT_TYPES: Record<ActivitySector, ProductType[]> = {
  [ActivitySector.VETEMENT]: [ProductType.SIMPLE, ProductType.VARIANT],
  [ActivitySector.ALIMENTAIRE]: [ProductType.SIMPLE, ProductType.PERISHABLE],
  [ActivitySector.ELECTRONIQUE]: [ProductType.SIMPLE, ProductType.VARIANT, ProductType.SERIALIZED],
  [ActivitySector.RESTAURATION]: [ProductType.MENU, ProductType.SIMPLE],
  [ActivitySector.BEAUTE_COSMETIQUE]: [ProductType.SIMPLE, ProductType.VARIANT, ProductType.PERISHABLE],
  [ActivitySector.QUINCAILLERIE]: [ProductType.SIMPLE, ProductType.VARIANT],
  [ActivitySector.LIBRAIRIE]: [ProductType.SIMPLE],
  [ActivitySector.PHARMACIE]: [ProductType.SIMPLE, ProductType.PERISHABLE, ProductType.SERIALIZED],
  [ActivitySector.BIJOUTERIE]: [ProductType.SIMPLE, ProductType.VARIANT, ProductType.SERIALIZED],
  [ActivitySector.AUTRE]: [ProductType.SIMPLE, ProductType.VARIANT, ProductType.SERIALIZED, ProductType.PERISHABLE, ProductType.MENU],
};

/** Indique si le secteur utilise des recettes (BOM) avec ingredients */
export const SECTORS_AVEC_INGREDIENTS: ActivitySector[] = [
  ActivitySector.RESTAURATION,
];

/** Libelle court d'une unite (ex: "kg", "mL", "piece"). Pour affichage compact. */
export const UNITE_LABELS: Record<UniteMesure, string> = {
  [UniteMesure.G]: "g",
  [UniteMesure.KG]: "kg",
  [UniteMesure.ML]: "mL",
  [UniteMesure.L]: "L",
  [UniteMesure.CM]: "cm",
  [UniteMesure.M]: "m",
  [UniteMesure.PIECE]: "pièce",
  [UniteMesure.DOUZAINE]: "douzaine",
  [UniteMesure.LOT]: "lot",
};

/** Libelle long (ex: "kilogramme"). Pour formulaires et libelles d'aide. */
export const UNITE_LABELS_LONGS: Record<UniteMesure, string> = {
  [UniteMesure.G]: "gramme",
  [UniteMesure.KG]: "kilogramme",
  [UniteMesure.ML]: "millilitre",
  [UniteMesure.L]: "litre",
  [UniteMesure.CM]: "centimètre",
  [UniteMesure.M]: "mètre",
  [UniteMesure.PIECE]: "pièce",
  [UniteMesure.DOUZAINE]: "douzaine",
  [UniteMesure.LOT]: "lot",
};

/** Categorie d'une unite. Determine la compatibilite des conversions. */
export const UNITE_CATEGORIE: Record<UniteMesure, UniteCategorie> = {
  [UniteMesure.G]: UniteCategorie.POIDS,
  [UniteMesure.KG]: UniteCategorie.POIDS,
  [UniteMesure.ML]: UniteCategorie.VOLUME,
  [UniteMesure.L]: UniteCategorie.VOLUME,
  [UniteMesure.CM]: UniteCategorie.LONGUEUR,
  [UniteMesure.M]: UniteCategorie.LONGUEUR,
  [UniteMesure.PIECE]: UniteCategorie.UNITAIRE,
  [UniteMesure.DOUZAINE]: UniteCategorie.UNITAIRE,
  [UniteMesure.LOT]: UniteCategorie.UNITAIRE,
};

/**
 * Conversion vers l'unite de base de la categorie (g, mL, cm, piece).
 * Les calculs de stock se font tous en unite de base pour eviter les pertes
 * de precision. Ex: 1.5 KG -> 1500 G ; 0.25 L -> 250 ML ; 2 M -> 200 CM.
 */
export const UNITE_BASE: Record<UniteMesure, { unite: UniteMesure; facteur: number }> = {
  [UniteMesure.G]: { unite: UniteMesure.G, facteur: 1 },
  [UniteMesure.KG]: { unite: UniteMesure.G, facteur: 1000 },
  [UniteMesure.ML]: { unite: UniteMesure.ML, facteur: 1 },
  [UniteMesure.L]: { unite: UniteMesure.ML, facteur: 1000 },
  [UniteMesure.CM]: { unite: UniteMesure.CM, facteur: 1 },
  [UniteMesure.M]: { unite: UniteMesure.CM, facteur: 100 },
  [UniteMesure.PIECE]: { unite: UniteMesure.PIECE, facteur: 1 },
  [UniteMesure.DOUZAINE]: { unite: UniteMesure.PIECE, facteur: 12 },
  [UniteMesure.LOT]: { unite: UniteMesure.LOT, facteur: 1 },
};

/** Liste ordonnee d'unites a proposer dans un selecteur, par categorie. */
export const UNITES_PAR_CATEGORIE: Record<UniteCategorie, UniteMesure[]> = {
  [UniteCategorie.POIDS]: [UniteMesure.KG, UniteMesure.G],
  [UniteCategorie.VOLUME]: [UniteMesure.L, UniteMesure.ML],
  [UniteCategorie.LONGUEUR]: [UniteMesure.M, UniteMesure.CM],
  [UniteCategorie.UNITAIRE]: [UniteMesure.PIECE, UniteMesure.DOUZAINE, UniteMesure.LOT],
};

/** Vrai si l'unite accepte des quantites decimales (poids, volume, longueur). */
export function uniteAccepteDecimal(unite: UniteMesure): boolean {
  return UNITE_CATEGORIE[unite] !== UniteCategorie.UNITAIRE;
}

/**
 * Convertit une quantite d'une unite source vers une unite cible
 * de la meme categorie. Lance une erreur si les categories different.
 */
export function convertirVersUnite(
  quantite: number,
  source: UniteMesure,
  cible: UniteMesure,
): number {
  const baseSource = UNITE_BASE[source];
  const baseCible = UNITE_BASE[cible];
  if (baseSource.unite !== baseCible.unite) {
    throw new Error(
      `Conversion impossible entre ${source} (${UNITE_CATEGORIE[source]}) et ${cible} (${UNITE_CATEGORIE[cible]})`,
    );
  }
  return (quantite * baseSource.facteur) / baseCible.facteur;
}

/**
 * Formate une quantite avec son unite courte. Affiche les decimales seulement
 * si elles ne sont pas nulles (ex: 1.5 kg, 12 pièces, 0.250 kg).
 */
export function formaterQuantite(quantite: number, unite: UniteMesure): string {
  const estEntier = Math.abs(quantite - Math.round(quantite)) < 1e-9;
  const formate = estEntier
    ? Math.round(quantite).toString()
    : quantite.toFixed(3).replace(/\.?0+$/, "");
  return `${formate} ${UNITE_LABELS[unite]}`;
}

// ─── Types ───

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditContext {
  userId: string;
  tenantId: string;
  ip?: string;
}

// ─── Constants ───

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CURRENCIES = ["XOF", "XAF", "USD", "EUR", "GBP", "CNY"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "XOF";

export const CURRENCY_LABELS: Record<Currency, string> = {
  XOF: "Franc CFA BCEAO (XOF)",
  XAF: "Franc CFA BEAC (XAF)",
  USD: "Dollar américain (USD)",
  EUR: "Euro (EUR)",
  GBP: "Livre sterling (GBP)",
  CNY: "Yuan chinois (CNY)",
};

// ─── Plans SaaS ───

export enum SubscriptionPlan {
  TRIAL = "TRIAL",
  STARTER = "STARTER",
  PRO = "PRO",
  BUSINESS = "BUSINESS",
  ENTERPRISE = "ENTERPRISE",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  TRIAL = "TRIAL",
  PAST_DUE = "PAST_DUE",
  SUSPENDED = "SUSPENDED",
  CANCELLED = "CANCELLED",
}

/**
 * Limites par plan. `null` signifie illimite. Les chiffres sont indicatifs
 * (a aligner avec le pricing reel). Le plan TRIAL = STARTER pendant 14j.
 */
export interface PlanLimits {
  maxBoutiques: number | null;
  maxUtilisateurs: number | null;
  maxProduits: number | null;
  maxEmplacements: number | null;
  /** Acces aux features avancees (rapports avances, multi-tarifs, API). */
  features: {
    b2b: boolean;
    multiDevise: boolean;
    apiAccess: boolean;
    customDomain: boolean;
    marketplace: boolean;
  };
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.TRIAL]: {
    maxBoutiques: 1,
    maxUtilisateurs: 3,
    maxProduits: 50,
    maxEmplacements: 2,
    features: { b2b: false, multiDevise: false, apiAccess: false, customDomain: false, marketplace: false },
  },
  [SubscriptionPlan.STARTER]: {
    maxBoutiques: 1,
    maxUtilisateurs: 3,
    maxProduits: 200,
    maxEmplacements: 2,
    features: { b2b: false, multiDevise: false, apiAccess: false, customDomain: false, marketplace: false },
  },
  [SubscriptionPlan.PRO]: {
    maxBoutiques: 3,
    maxUtilisateurs: 10,
    maxProduits: 2000,
    maxEmplacements: 5,
    features: { b2b: true, multiDevise: true, apiAccess: false, customDomain: false, marketplace: false },
  },
  [SubscriptionPlan.BUSINESS]: {
    maxBoutiques: 10,
    maxUtilisateurs: 50,
    maxProduits: 20000,
    maxEmplacements: 20,
    features: { b2b: true, multiDevise: true, apiAccess: true, customDomain: true, marketplace: true },
  },
  [SubscriptionPlan.ENTERPRISE]: {
    maxBoutiques: null,
    maxUtilisateurs: null,
    maxProduits: null,
    maxEmplacements: null,
    features: { b2b: true, multiDevise: true, apiAccess: true, customDomain: true, marketplace: true },
  },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.TRIAL]: "Essai gratuit",
  [SubscriptionPlan.STARTER]: "Starter",
  [SubscriptionPlan.PRO]: "Pro",
  [SubscriptionPlan.BUSINESS]: "Business",
  [SubscriptionPlan.ENTERPRISE]: "Enterprise",
};

/** Prix mensuel en FCFA (a aligner avec le pricing reel — indicatif). */
export const PLAN_PRICES_FCFA: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.TRIAL]: 0,
  [SubscriptionPlan.STARTER]: 15_000,
  [SubscriptionPlan.PRO]: 45_000,
  [SubscriptionPlan.BUSINESS]: 120_000,
  [SubscriptionPlan.ENTERPRISE]: 0, // sur devis
};

/** Duree du trial offert a l'inscription (jours). */
export const TRIAL_DURATION_DAYS = 14;
