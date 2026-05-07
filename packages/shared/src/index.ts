// ─── Enums ───

export enum ProductType {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
  MENU = "MENU",
}

export enum IngredientUnit {
  G = "G",
  KG = "KG",
  ML = "ML",
  L = "L",
  PIECE = "PIECE",
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

export const INGREDIENT_UNIT_LABELS: Record<IngredientUnit, string> = {
  [IngredientUnit.G]: "g",
  [IngredientUnit.KG]: "kg",
  [IngredientUnit.ML]: "mL",
  [IngredientUnit.L]: "L",
  [IngredientUnit.PIECE]: "pièce",
};

/**
 * Conversion vers l'unite de base (g, mL ou pieces) pour faire les
 * calculs de stock. Les ingredients stockes en kg sont convertis en g
 * dans les calculs internes.
 */
export const INGREDIENT_UNIT_BASE: Record<IngredientUnit, { unit: IngredientUnit; factor: number }> = {
  [IngredientUnit.G]: { unit: IngredientUnit.G, factor: 1 },
  [IngredientUnit.KG]: { unit: IngredientUnit.G, factor: 1000 },
  [IngredientUnit.ML]: { unit: IngredientUnit.ML, factor: 1 },
  [IngredientUnit.L]: { unit: IngredientUnit.ML, factor: 1000 },
  [IngredientUnit.PIECE]: { unit: IngredientUnit.PIECE, factor: 1 },
};

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
