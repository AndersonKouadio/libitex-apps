import { pgTable, uuid, boolean, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users, userRoleEnum } from "./users";

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  role: userRoleEnum("role").notNull().default("CASHIER"),
  isOwner: boolean("is_owner").notNull().default(false),
  accessAllLocations: boolean("access_all_locations").notNull().default(true),
  locationIds: jsonb("location_ids").$type<string[]>().notNull().default([]),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_memberships_user").on(table.userId),
  index("idx_memberships_tenant").on(table.tenantId),
  unique("uq_membership_user_tenant").on(table.userId, table.tenantId),
]);
