import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, memberships, tenants } from "@libitex/db";

interface CreerMembershipData {
  userId: string;
  tenantId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "COMMERCIAL" | "CASHIER" | "WAREHOUSE";
  isOwner?: boolean;
  accessAllLocations?: boolean;
  locationIds?: string[];
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

  async existePourUtilisateur(userId: string): Promise<boolean> {
    const m = await this.db.query.memberships.findFirst({
      where: eq(memberships.userId, userId),
    });
    return !!m;
  }
}
