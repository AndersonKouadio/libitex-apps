import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, eq, gte, lt, isNull, sql } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import { type Database, reservations, customers, tenants } from "@libitex/db";
import { NotificationsService } from "./notifications.service";

/**
 * Module 10 D3 : cron jobs pour les notifications proactives.
 *
 * Strategie :
 * - Rappel reservation J-1 : tous les jours a 9h locale, on cherche les
 *   reservations CONFIRMED ou PENDING dont reservedAt est demain (sur la
 *   journee entiere 00:00 -> 23:59). On envoie un rappel WhatsApp.
 *
 * Idempotence : NotificationsService.envoyer({ antiDoublon: true })
 * verifie qu'on a pas deja envoye le `reservation_reminder` pour cette
 * reservation. Si le cron crashe ou rejoue 2x, pas de doublon.
 */
@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Tous les jours a 9h00 (heure du serveur). Pour les commerces africains
   * (UTC+0 a UTC+2), c'est generalement 9h-11h locale -> bon creneau.
   *
   * En production, on peut passer a TZ='Africa/Abidjan' via env CRON_TZ
   * + plusieurs decorateurs si on veut un envoi differencie par region.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: "reservation-reminder-j-1" })
  async envoyerRappelsReservation(): Promise<void> {
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    demain.setHours(0, 0, 0, 0);
    const apresDemain = new Date(demain);
    apresDemain.setDate(apresDemain.getDate() + 1);

    this.logger.log(
      `Cron reservation-reminder-j-1 : recherche reservations entre ` +
        `${demain.toISOString()} et ${apresDemain.toISOString()}`,
    );

    // Une seule query : reservations + tenant.name + customer.opt_in.
    // On filtre les statuts qui ont du sens (PENDING/CONFIRMED).
    const rows = await this.db
      .select({
        reservationId: reservations.id,
        tenantId: reservations.tenantId,
        nomBoutique: tenants.name,
        customerPhone: reservations.customerPhone,
        customerName: reservations.customerName,
        reservedAt: reservations.reservedAt,
        partySize: reservations.partySize,
        tableNumber: reservations.tableNumber,
        clientOptIn: customers.whatsappOptIn,
      })
      .from(reservations)
      .innerJoin(tenants, eq(reservations.tenantId, tenants.id))
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(and(
        gte(reservations.reservedAt, demain),
        lt(reservations.reservedAt, apresDemain),
        isNull(reservations.deletedAt),
        sql`${reservations.status} IN ('PENDING', 'CONFIRMED')`,
      ));

    let envoyes = 0;
    let skippes = 0;
    for (const r of rows) {
      if (!r.customerPhone) { skippes++; continue; }
      if (r.clientOptIn === false) { skippes++; continue; }

      const texte = this.notifications.templates.reservationReminder({
        nomClient: r.customerName,
        dateHeure: r.reservedAt,
        nombrePersonnes: r.partySize,
        numeroTable: r.tableNumber,
        nomBoutique: r.nomBoutique,
      });

      const ok = await this.notifications.envoyer({
        tenantId: r.tenantId,
        canal: "whatsapp",
        type: "reservation_reminder",
        destinataire: r.customerPhone,
        texte,
        entityType: "RESERVATION",
        entityId: r.reservationId,
        antiDoublon: true,
        payload: { reservedAt: r.reservedAt.toISOString() },
      });
      if (ok) envoyes++;
    }

    this.logger.log(
      `Cron reservation-reminder-j-1 termine : ${rows.length} candidats, ` +
        `${envoyes} envoyes, ${skippes} ignores (no phone / opt-out).`,
    );
  }
}
