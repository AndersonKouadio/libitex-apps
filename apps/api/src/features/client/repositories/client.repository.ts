import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, or, ilike, sql } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, customers } from "@libitex/db";

interface CreerClientData {
  tenantId: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

@Injectable()
export class ClientRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: CreerClientData) {
    const [client] = await this.db.insert(customers).values(data).returning();
    return client;
  }

  async lister(tenantId: string, page: number, limit: number, recherche?: string) {
    const conditions = [eq(customers.tenantId, tenantId), isNull(customers.deletedAt)];

    if (recherche) {
      conditions.push(
        or(
          ilike(customers.firstName, `%${recherche}%`),
          ilike(customers.lastName, `%${recherche}%`),
          ilike(customers.phone, `%${recherche}%`),
          ilike(customers.email, `%${recherche}%`),
        )!,
      );
    }

    const offset = (page - 1) * limit;
    const data = await this.db.query.customers.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: customers.firstName,
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(and(...conditions));

    return { data, total: Number(countResult?.count ?? 0) };
  }

  async trouverParId(tenantId: string, id: string) {
    return this.db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
    });
  }

  async modifier(tenantId: string, id: string, data: Partial<CreerClientData>) {
    const [updated] = await this.db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  }
}
