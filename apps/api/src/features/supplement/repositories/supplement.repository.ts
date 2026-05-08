import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, supplements } from "@libitex/db";

interface CreerData {
  tenantId: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  image?: string;
}

@Injectable()
export class SupplementRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: CreerData) {
    const [s] = await this.db.insert(supplements).values(data).returning();
    return s;
  }

  async lister(tenantId: string) {
    return this.db.query.supplements.findMany({
      where: and(eq(supplements.tenantId, tenantId), isNull(supplements.deletedAt)),
      orderBy: supplements.name,
    });
  }

  async listerActifs(tenantId: string) {
    return this.db.query.supplements.findMany({
      where: and(
        eq(supplements.tenantId, tenantId),
        eq(supplements.isActive, true),
        isNull(supplements.deletedAt),
      ),
      orderBy: supplements.name,
    });
  }

  async listerParIds(tenantId: string, ids: string[]) {
    if (ids.length === 0) return [];
    return this.db.query.supplements.findMany({
      where: and(
        eq(supplements.tenantId, tenantId),
        inArray(supplements.id, ids),
        isNull(supplements.deletedAt),
      ),
    });
  }

  async trouverParId(tenantId: string, id: string) {
    return this.db.query.supplements.findFirst({
      where: and(
        eq(supplements.id, id),
        eq(supplements.tenantId, tenantId),
        isNull(supplements.deletedAt),
      ),
    });
  }

  async modifier(tenantId: string, id: string, data: Partial<{
    name: string;
    description: string;
    price: string;
    category: string;
    image: string;
    isActive: boolean;
  }>) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const [updated] = await this.db
      .update(supplements)
      .set({ ...cleaned, updatedAt: new Date() })
      .where(and(eq(supplements.id, id), eq(supplements.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(supplements)
      .set({ deletedAt: new Date() })
      .where(and(eq(supplements.id, id), eq(supplements.tenantId, tenantId)));
  }
}
