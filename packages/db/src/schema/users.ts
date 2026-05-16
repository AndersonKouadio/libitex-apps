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
  // Force l'utilisateur a changer son mot de passe a la prochaine connexion
  // (cas typique : membres invites avec mot de passe temporaire)
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  refreshToken: text("refresh_token"),
  // Token de reinitialisation du mot de passe (lien email).
  // Stocke hashe (sha256) pour qu'un dump DB ne donne pas acces aux liens en cours.
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  // MFA TOTP (RFC 6238) : secret base32 + flag actif.
  // Le secret est genere a la mise en place et verifie via Google Authenticator
  // ou compatible (Authy, 1Password, etc.). Stocke en clair (encrypted-at-rest
  // au niveau DB) — pas hashable car on doit le re-utiliser pour valider chaque
  // code a 6 chiffres.
  mfaSecret: text("mfa_secret"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
