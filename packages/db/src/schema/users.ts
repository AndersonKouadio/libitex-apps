import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "COMMERCIAL",
  "CASHIER",
  "WAREHOUSE",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // tenantId: garde pendant la migration vers memberships, deviendra nullable.
  // Sera retire apres l'audit complet du code (voir memberships pour la nouvelle source).
  tenantId: uuid("tenant_id"),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  // role: garde pour le moment, sera porte par memberships.role
  role: userRoleEnum("role").notNull().default("CASHIER"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
