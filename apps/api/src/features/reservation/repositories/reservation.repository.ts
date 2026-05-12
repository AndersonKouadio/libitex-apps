import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, gte, lte, sql, asc, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, reservations, customers, tenants,
} from "@libitex/db";

@Injectable()
export class ReservationRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async creer(data: {
    tenantId: string;
    locationId: string;
    customerId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    tableNumber?: string | null;
    reservedAt: Date;
    partySize: number;
    notes?: string | null;
    createdBy?: string;
  }) {
    const [row] = await this.db.insert(reservations).values(data).returning();
    return row;
  }

  async lister(tenantId: string, filtres: {
    locationId?: string;
    statut?: string;
    dateDebut?: Date;
    dateFin?: Date;
  } = {}) {
    const conditions: SQL[] = [
      eq(reservations.tenantId, tenantId),
      isNull(reservations.deletedAt),
    ];
    if (filtres.locationId) conditions.push(eq(reservations.locationId, filtres.locationId));
    if (filtres.statut) conditions.push(eq(reservations.status, filtres.statut as any));
    if (filtres.dateDebut) conditions.push(gte(reservations.reservedAt, filtres.dateDebut));
    if (filtres.dateFin) conditions.push(lte(reservations.reservedAt, filtres.dateFin));

    return this.db
      .select({
        id: reservations.id,
        locationId: reservations.locationId,
        customerId: reservations.customerId,
        customerName: reservations.customerName,
        customerPhone: reservations.customerPhone,
        tableNumber: reservations.tableNumber,
        reservedAt: reservations.reservedAt,
        partySize: reservations.partySize,
        status: reservations.status,
        notes: reservations.notes,
        createdAt: reservations.createdAt,
      })
      .from(reservations)
      .where(and(...conditions))
      .orderBy(asc(reservations.reservedAt));
  }

  async trouver(tenantId: string, id: string) {
    return this.db.query.reservations.findFirst({
      where: and(
        eq(reservations.id, id),
        eq(reservations.tenantId, tenantId),
        isNull(reservations.deletedAt),
      ),
    });
  }

  async modifier(tenantId: string, id: string, data: Partial<{
    customerId: string | null;
    customerName: string;
    customerPhone: string | null;
    tableNumber: string | null;
    reservedAt: Date;
    partySize: number;
    status: "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    notes: string | null;
  }>) {
    const [row] = await this.db
      .update(reservations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId)))
      .returning();
    return row;
  }

  async supprimer(tenantId: string, id: string) {
    await this.db
      .update(reservations)
      .set({ deletedAt: new Date() })
      .where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId)));
  }

  /**
   * Module 10 D2 : recupere les infos necessaires pour envoyer une
   * notification de reservation (nom boutique + opt-in client si lie).
   * Le customerPhone snapshot est sur reservations directement.
   */
  async obtenirContexteNotification(tenantId: string, reservationId: string) {
    const [row] = await this.db
      .select({
        nomBoutique: tenants.name,
        customerPhone: reservations.customerPhone,
        customerName: reservations.customerName,
        reservedAt: reservations.reservedAt,
        partySize: reservations.partySize,
        tableNumber: reservations.tableNumber,
        status: reservations.status,
        clientOptIn: customers.whatsappOptIn,
      })
      .from(reservations)
      .innerJoin(tenants, eq(reservations.tenantId, tenants.id))
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(and(eq(reservations.id, reservationId), eq(reservations.tenantId, tenantId)));
    return row;
  }

  /**
   * Compteurs par statut sur la journee — pour le badge sidebar ou un
   * tableau de bord rapido.
   */
  async resumeJour(tenantId: string, debut: Date, fin: Date) {
    const rows = await this.db
      .select({
        status: reservations.status,
        n: sql<number>`COUNT(*)::int`,
        couverts: sql<number>`COALESCE(SUM(${reservations.partySize}), 0)::int`,
      })
      .from(reservations)
      .where(and(
        eq(reservations.tenantId, tenantId),
        gte(reservations.reservedAt, debut),
        lte(reservations.reservedAt, fin),
        isNull(reservations.deletedAt),
      ))
      .groupBy(reservations.status);
    return rows;
  }
}
