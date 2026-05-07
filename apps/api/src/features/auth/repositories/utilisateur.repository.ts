import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
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
    return this.db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  }

  async trouverTenantParId(id: string) {
    return this.db.query.tenants.findFirst({ where: eq(tenants.id, id) });
  }

  async creerUtilisateur(data: {
    tenantId?: string; email: string; passwordHash: string;
    firstName: string; lastName: string; phone?: string;
    role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "COMMERCIAL" | "CASHIER" | "WAREHOUSE";
  }) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async trouverParEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.isActive, true)),
    });
  }

  async trouverParId(id: string) {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async mettreAJourDerniereConnexion(userId: string) {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  }

  async sauvegarderRefreshToken(userId: string, hash: string) {
    await this.db.update(users).set({ refreshToken: hash }).where(eq(users.id, userId));
  }
}
