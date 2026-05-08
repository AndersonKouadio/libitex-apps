import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, memberships, tenants, users } from "@libitex/db";

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "COMMERCIAL" | "CASHIER" | "WAREHOUSE";

interface CreerMembershipData {
  userId: string;
  tenantId: string;
  role: Role;
  isOwner?: boolean;
  accessAllLocations?: boolean;
  locationIds?: string[];
}

interface ModifierMembershipData {
  role?: Role;
  accessAllLocations?: boolean;
  locationIds?: string[];
  isActive?: boolean;
}

@Injectable()
export class MembershipRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: CreerMembershipData) {
    const [m] = await this.db.insert(memberships).values({
      userId: data.userId,
      tenantId: data.tenantId,
      role: data.role,
      isOwner: data.isOwner ?? false,
      accessAllLocations: data.accessAllLocations ?? true,
      locationIds: data.locationIds ?? [],
      acceptedAt: new Date(),
    }).returning();
    return m;
  }

  async modifier(membershipId: string, tenantId: string, data: ModifierMembershipData) {
    const [m] = await this.db
      .update(memberships)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .returning();
    return m;
  }

  async listerParUtilisateur(userId: string) {
    return this.db
      .select({
        membership: memberships,
        tenant: tenants,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(and(
        eq(memberships.userId, userId),
        eq(memberships.isActive, true),
        isNull(tenants.deletedAt),
      ));
  }

  async listerParTenant(tenantId: string) {
    return this.db
      .select({
        membership: memberships,
        user: users,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.isActive, true),
      ));
  }

  async trouver(userId: string, tenantId: string) {
    return this.db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, userId),
        eq(memberships.tenantId, tenantId),
        eq(memberships.isActive, true),
      ),
    });
  }

  async trouverParId(id: string, tenantId: string) {
    return this.db.query.memberships.findFirst({
      where: and(eq(memberships.id, id), eq(memberships.tenantId, tenantId)),
    });
  }

  async existePourUtilisateur(userId: string): Promise<boolean> {
    const m = await this.db.query.memberships.findFirst({
      where: eq(memberships.userId, userId),
    });
    return !!m;
  }

  async compterAdminsActifs(tenantId: string): Promise<number> {
    const list = await this.db.query.memberships.findMany({
      where: and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.role, "ADMIN"),
        eq(memberships.isActive, true),
      ),
    });
    return list.length;
  }

  async desactiverPourTenant(tenantId: string) {
    await this.db
      .update(memberships)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(memberships.tenantId, tenantId));
  }

  async desactiverPourUtilisateur(userId: string) {
    await this.db
      .update(memberships)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(memberships.userId, userId));
  }

  /**
   * Compte les autres proprietaires actifs d'un tenant (hors `userId`). Sert a
   * decider, lors d'une suppression de compte, si le tenant doit egalement
   * etre soft-supprime (aucun autre proprietaire) ou laisse aux co-proprietaires.
   */
  async compterAutresProprietaires(tenantId: string, userId: string): Promise<number> {
    const list = await this.db.query.memberships.findMany({
      where: and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.isOwner, true),
        eq(memberships.isActive, true),
      ),
    });
    return list.filter((m) => m.userId !== userId).length;
  }
}
