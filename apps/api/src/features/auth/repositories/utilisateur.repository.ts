import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, users, tenants } from "@libitex/db";
import { ActivitySector, ACTIVITY_SECTOR_PRODUCT_TYPES } from "@libitex/shared";

interface CreerTenantData {
  name: string;
  slug: string;
  email?: string;
  currency?: string;
  activitySector?: ActivitySector;
}

@Injectable()
export class UtilisateurRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creerTenant(data: CreerTenantData) {
    const sector = data.activitySector ?? ActivitySector.AUTRE;
    const [tenant] = await this.db.insert(tenants).values({
      name: data.name,
      slug: data.slug,
      email: data.email,
      currency: data.currency,
      activitySector: sector,
      productTypesAllowed: ACTIVITY_SECTOR_PRODUCT_TYPES[sector],
    }).returning();
    return tenant;
  }

  async trouverTenantParSlug(slug: string) {
    return this.db.query.tenants.findFirst({
      where: and(eq(tenants.slug, slug), isNull(tenants.deletedAt)),
    });
  }

  async trouverTenantParId(id: string) {
    return this.db.query.tenants.findFirst({
      where: and(eq(tenants.id, id), isNull(tenants.deletedAt)),
    });
  }

  async creerUtilisateur(data: {
    tenantId?: string; email: string; passwordHash: string;
    firstName: string; lastName: string; phone?: string;
    role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "COMMERCIAL" | "CASHIER" | "WAREHOUSE";
    mustChangePassword?: boolean;
  }) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async changerMotDePasse(userId: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async trouverParEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ),
    });
  }

  async trouverParId(id: string) {
    return this.db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
  }

  async modifierUtilisateur(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
  }>) {
    const cleaned: Record<string, unknown> = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) cleaned[k] = v;
    });
    const [updated] = await this.db
      .update(users)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async supprimerUtilisateur(id: string) {
    await this.db
      .update(users)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async mettreAJourDerniereConnexion(userId: string) {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  }

  async sauvegarderRefreshToken(userId: string, hash: string) {
    await this.db.update(users).set({ refreshToken: hash }).where(eq(users.id, userId));
  }

  /**
   * Invalide la session en stockant NULL (plutot que chaine vide). Utilise
   * en cas de suspicion de vol de token (mismatch hash) ou de logout
   * explicite : aucune autre tentative de refresh ne pourra reussir tant
   * qu'une nouvelle connexion n'est pas faite.
   */
  async invaliderRefreshToken(userId: string) {
    await this.db.update(users).set({ refreshToken: null }).where(eq(users.id, userId));
  }

  async sauvegarderTokenReset(userId: string, tokenHash: string, expiresAt: Date) {
    await this.db
      .update(users)
      .set({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt })
      .where(eq(users.id, userId));
  }

  async trouverParTokenResetHash(tokenHash: string) {
    return this.db.query.users.findFirst({
      where: and(
        eq(users.passwordResetTokenHash, tokenHash),
        eq(users.isActive, true),
      ),
    });
  }

  async invaliderTokenReset(userId: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async modifierTenant(id: string, data: Partial<{
    name: string;
    currency: string;
    activitySector: string;
    productTypesAllowed: string[];
    email: string;
    phone: string;
    address: string;
    taxRate: string;
    paymentMethods: Array<"CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT">;
    /** Module 14 D1 : null efface le logo, undefined ne touche pas. */
    logoUrl: string | null;
  }>) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const [updated] = await this.db
      .update(tenants)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async supprimerTenant(id: string) {
    // Soft delete : on ajoute un timestamp deletedAt sans casser les references.
    await this.db
      .update(tenants)
      .set({ deletedAt: new Date() })
      .where(eq(tenants.id, id));
  }
}
