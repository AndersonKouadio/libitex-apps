// ─── Enums ───

export enum ProductType {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
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
