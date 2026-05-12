import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ReservationRepository } from "./repositories/reservation.repository";
import {
  CreerReservationDto, ModifierReservationDto,
  ReservationResponseDto, ResumeJourDto,
} from "./dto/reservation.dto";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ReservationService {
  constructor(
    private readonly repo: ReservationRepository,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async creer(
    tenantId: string,
    userId: string,
    dto: CreerReservationDto,
  ): Promise<ReservationResponseDto> {
    const dateRes = new Date(dto.dateReservation);
    if (Number.isNaN(dateRes.getTime())) {
      throw new BadRequestException("Date de reservation invalide");
    }
    const row = await this.repo.creer({
      tenantId,
      locationId: dto.emplacementId,
      customerId: dto.clientId ?? null,
      customerName: dto.nomClient,
      customerPhone: dto.telephone ?? null,
      tableNumber: dto.numeroTable ?? null,
      reservedAt: dateRes,
      partySize: dto.nombrePersonnes,
      notes: dto.notes ?? null,
      createdBy: userId,
    });
    this.realtime.emitToTenant(tenantId, "reservation.changed", {
      reservationId: row.id, action: "created",
    });

    // Module 10 D2 : confirmation WhatsApp en best-effort. Conditions :
    // - reservation a un telephone (snapshot, suffit meme sans customerId)
    // - si client lie : respecter whatsapp_opt_in
    // - antiDoublon : pas de double envoi si l'API retry
    this.envoyerNotifReservation(tenantId, row.id, "reservation_created")
      .catch((err) => console.error("[notif reservation.created] echoue:", err));

    return this.map(row);
  }

  async lister(
    tenantId: string,
    filtres: {
      emplacementId?: string;
      statut?: string;
      dateDebut?: string;
      dateFin?: string;
    } = {},
  ): Promise<ReservationResponseDto[]> {
    const rows = await this.repo.lister(tenantId, {
      locationId: filtres.emplacementId,
      statut: filtres.statut,
      dateDebut: filtres.dateDebut ? new Date(filtres.dateDebut) : undefined,
      dateFin: filtres.dateFin ? new Date(filtres.dateFin) : undefined,
    });
    return rows.map((r) => this.map(r));
  }

  async obtenir(tenantId: string, id: string): Promise<ReservationResponseDto> {
    const row = await this.repo.trouver(tenantId, id);
    if (!row) throw new NotFoundException("Reservation introuvable");
    return this.map(row);
  }

  async modifier(
    tenantId: string,
    id: string,
    dto: ModifierReservationDto,
  ): Promise<ReservationResponseDto> {
    const existant = await this.repo.trouver(tenantId, id);
    if (!existant) throw new NotFoundException("Reservation introuvable");

    const data: any = {};
    if (dto.clientId !== undefined) data.customerId = dto.clientId;
    if (dto.nomClient !== undefined) data.customerName = dto.nomClient;
    if (dto.telephone !== undefined) data.customerPhone = dto.telephone;
    if (dto.numeroTable !== undefined) data.tableNumber = dto.numeroTable;
    if (dto.dateReservation !== undefined) {
      const d = new Date(dto.dateReservation);
      if (Number.isNaN(d.getTime())) throw new BadRequestException("Date invalide");
      data.reservedAt = d;
    }
    if (dto.nombrePersonnes !== undefined) data.partySize = dto.nombrePersonnes;
    if (dto.statut !== undefined) data.status = dto.statut;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const row = await this.repo.modifier(tenantId, id, data);
    this.realtime.emitToTenant(tenantId, "reservation.changed", {
      reservationId: row.id, action: "updated",
    });

    // Module 10 D2 : si le statut a change, notifier le client.
    // Les transitions silencieuses (notes, table) ne declenchent rien.
    if (dto.statut && dto.statut !== existant.status) {
      this.envoyerNotifReservation(tenantId, row.id, "reservation_status", dto.statut)
        .catch((err) => console.error("[notif reservation.status] echoue:", err));
    }

    return this.map(row);
  }

  /**
   * Module 10 D2 : envoie une notification de reservation au client.
   * Helper unifie pour creer/modifier — choisit le template selon le type.
   */
  private async envoyerNotifReservation(
    tenantId: string,
    reservationId: string,
    type: "reservation_created" | "reservation_status",
    nouveauStatut?: string,
  ): Promise<void> {
    const ctx = await this.repo.obtenirContexteNotification(tenantId, reservationId);
    if (!ctx?.customerPhone) return;
    // Si le client est lie au CRM et a opt-out, on respecte.
    // Si pas lie (saisie libre), on envoie quand meme (le numero a ete
    // saisi par le commercant explicitement pour ce booking).
    if (ctx.clientOptIn === false) return;

    let texte: string;
    if (type === "reservation_created") {
      texte = this.notifications.templates.reservationCreated({
        nomClient: ctx.customerName,
        dateHeure: ctx.reservedAt,
        nombrePersonnes: ctx.partySize,
        numeroTable: ctx.tableNumber,
        nomBoutique: ctx.nomBoutique,
      });
    } else {
      texte = this.notifications.templates.reservationStatusChanged({
        nomClient: ctx.customerName,
        statut: (nouveauStatut ?? ctx.status) as any,
        dateHeure: ctx.reservedAt,
        nomBoutique: ctx.nomBoutique,
      });
    }

    await this.notifications.envoyer({
      tenantId,
      canal: "whatsapp",
      type,
      destinataire: ctx.customerPhone,
      texte,
      entityType: "RESERVATION",
      entityId: reservationId,
      // Pour `created`, antiDoublon evite les doublons sur retry.
      // Pour `status`, on autorise plusieurs envois (chaque changement).
      antiDoublon: type === "reservation_created",
      payload: { type, statut: nouveauStatut },
    });
  }

  async supprimer(tenantId: string, id: string): Promise<void> {
    const existant = await this.repo.trouver(tenantId, id);
    if (!existant) throw new NotFoundException("Reservation introuvable");
    await this.repo.supprimer(tenantId, id);
    this.realtime.emitToTenant(tenantId, "reservation.changed", {
      reservationId: id, action: "deleted",
    });
  }

  /**
   * Resume des reservations sur une journee donnee. Si date null, prend
   * aujourd'hui (00:00 -> 23:59:59).
   */
  async resumeJour(tenantId: string, dateISO?: string): Promise<ResumeJourDto> {
    const base = dateISO ? new Date(dateISO) : new Date();
    const debut = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
    const fin = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);

    const rows = await this.repo.resumeJour(tenantId, debut, fin);
    const parStatut: Record<string, { nombre: number; couverts: number }> = {};
    let totalReservations = 0;
    let totalCouverts = 0;
    for (const r of rows) {
      const n = Number(r.n);
      const c = Number(r.couverts);
      parStatut[r.status] = { nombre: n, couverts: c };
      totalReservations += n;
      totalCouverts += c;
    }
    return {
      date: debut.toISOString().slice(0, 10),
      totalReservations,
      totalCouverts,
      parStatut,
    };
  }

  private map(row: any): ReservationResponseDto {
    return {
      id: row.id,
      emplacementId: row.locationId,
      clientId: row.customerId ?? null,
      nomClient: row.customerName,
      telephone: row.customerPhone ?? null,
      numeroTable: row.tableNumber ?? null,
      dateReservation: row.reservedAt instanceof Date
        ? row.reservedAt.toISOString()
        : new Date(row.reservedAt).toISOString(),
      nombrePersonnes: row.partySize,
      statut: row.status,
      notes: row.notes ?? null,
      creeLe: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    };
  }
}
