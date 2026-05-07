import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const activitySectorEnum = pgEnum("activity_sector", [
  "VETEMENT",
  "ALIMENTAIRE",
  "ELECTRONIQUE",
  "RESTAURATION",
  "BEAUTE_COSMETIQUE",
  "QUINCAILLERIE",
  "LIBRAIRIE",
  "PHARMACIE",
  "BIJOUTERIE",
  "AUTRE",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  taxRate: varchar("tax_rate", { length: 10 }).default("0"),
  logoUrl: text("logo_url"),
  activitySector: activitySectorEnum("activity_sector").notNull().default("AUTRE"),
  productTypesAllowed: jsonb("product_types_allowed").$type<string[]>().notNull().default(["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE"]),
  isActive: boolean("is_active").notNull().default(true),
  customDomain: varchar("custom_domain", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
