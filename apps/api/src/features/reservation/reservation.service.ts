import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ReservationRepository } from "./repositories/reservation.repository";
import {
  CreerReservationDto, ModifierReservationDto,
  ReservationResponseDto, ResumeJourDto, StatutReservation,
} from "./dto/reservation.dto";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";

/**
 * Module 12 D1 (fix I3) : state machine simplifiee des reservations.
 * Empeche les transitions aberrantes (ex: COMPLETED -> PENDING).
 */
const TRANSITIONS_AUTORISEES: Record<StatutReservation, StatutReservation[]> = {
  PENDING:   ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["SEATED", "CANCELLED", "NO_SHOW", "PENDING"],
  SEATED:    ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // terminal
  CANCELLED: [], // terminal
  NO_SHOW:   [], // terminal
};

function transitionPermise(de: StatutReservation, vers: StatutReservation): boolean {
  if (de === vers) return true; // no-op autorise
  return TRANSITIONS_AUTORISEES[de]?.includes(vers) ?? false;
}

/**
 * Module 12 D1 (fix C3) : tolerance pour la date passee. Une reservation
 * pour il y a 1h peut etre saisie (correction tardive). Au-dela : refus.
 */
const TOLERANCE_PASSE_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class ReservationService {
  constructor(
    private readonly repo: ReservationRepository,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async creer(
    tenantId: string,
    userId: string,
    dto: CreerReservationDto,
  ): Promise<ReservationResponseDto> {
    // ─── Validation date ──────────────────────────────────────────────
    const dateRes = new Date(dto.dateReservation);
    if (Number.isNaN(dateRes.getTime())) {
      throw new BadRequestException("Date de reservation invalide");
    }
    // Fix C3 : refuser dates trop dans le passe (au-dela d'1h)
    if (dateRes.getTime() < Date.now() - TOLERANCE_PASSE_MS) {
      throw new BadRequestException("La date de reservation ne peut pas etre dans le passe");
    }

    // ─── Cross-tenant checks (fix C1+C2) ──────────────────────────────
    const empOk = await this.repo.emplacementAppartientTenant(tenantId, dto.emplacementId);
    if (!empOk) {
      throw new ForbiddenException("Emplacement introuvable pour ce tenant");
    }
    if (dto.clientId) {
      const clientOk = await this.repo.clientAppartientTenant(tenantId, dto.clientId);
      if (!clientOk) {
        throw new ForbiddenException("Client introuvable pour ce tenant");
      }
    }

    // ─── Detection conflit horaire (fix C4) ───────────────────────────
    if (dto.numeroTable?.trim()) {
      const conflit = await this.repo.detecterConflitHoraire({
        tenantId,
        locationId: dto.emplacementId,
        tableNumber: dto.numeroTable.trim(),
        reservedAt: dateRes,
      });
      if (conflit) {
        const heureConflit = conflit.reservedAt.toLocaleTimeString("fr-FR", {
          hour: "2-digit", minute: "2-digit",
        });
        throw new BadRequestException(
          `Conflit : la table "${dto.numeroTable.trim()}" est deja reservee pour ` +
            `${conflit.customerName} a ${heureConflit} (a moins de 90 min).`,
        );
      }
    }

    // ─── Creation ─────────────────────────────────────────────────────
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

    // Module 12 D1 (I2) : audit log
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.RESERVATION_CREATED,
      entityType: "RESERVATION", entityId: row.id,
      after: {
        emplacementId: dto.emplacementId, nomClient: dto.nomClient,
        dateReservation: dateRes.toISOString(), couverts: dto.nombrePersonnes,
        table: dto.numeroTable ?? null,
      },
    });

    this.realtime.emitToTenant(tenantId, "reservation.changed", {
      reservationId: row.id, action: "created",
    });

    // Module 10 D2 : confirmation WhatsApp en best-effort.
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
    userId: string,
    id: string,
    dto: ModifierReservationDto,
  ): Promise<ReservationResponseDto> {
    const existant = await this.repo.trouver(tenantId, id);
    if (!existant) throw new NotFoundException("Reservation introuvable");

    // ─── Cross-tenant check sur clientId si change (fix C2) ──────────
    if (dto.clientId) {
      const clientOk = await this.repo.clientAppartientTenant(tenantId, dto.clientId);
      if (!clientOk) {
        throw new ForbiddenException("Client introuvable pour ce tenant");
      }
    }

    // ─── State machine (fix I3) ───────────────────────────────────────
    if (dto.statut !== undefined && dto.statut !== existant.status) {
      if (!transitionPermise(existant.status as StatutReservation, dto.statut)) {
        throw new BadRequestException(
          `Transition de statut interdite : ${existant.status} -> ${dto.statut}`,
        );
      }
    }

    const data: any = {};
    if (dto.clientId !== undefined) data.customerId = dto.clientId;
    if (dto.nomClient !== undefined) data.customerName = dto.nomClient;
    if (dto.telephone !== undefined) data.customerPhone = dto.telephone;
    if (dto.numeroTable !== undefined) data.tableNumber = dto.numeroTable;

    let dateChangee: Date | undefined;
    if (dto.dateReservation !== undefined) {
      const d = new Date(dto.dateReservation);
      if (Number.isNaN(d.getTime())) throw new BadRequestException("Date invalide");
      data.reservedAt = d;
      dateChangee = d;
    }
    if (dto.nombrePersonnes !== undefined) data.partySize = dto.nombrePersonnes;
    if (dto.statut !== undefined) data.status = dto.statut;
    if (dto.notes !== undefined) data.notes = dto.notes;

    // ─── Conflit horaire si on change date OU table (fix C4) ─────────
    const nouvelleDate = dateChangee ?? existant.reservedAt;
    const nouvelleTable = dto.numeroTable ?? existant.tableNumber;
    if (nouvelleTable?.trim()) {
      const conflit = await this.repo.detecterConflitHoraire({
        tenantId,
        locationId: existant.locationId,
        tableNumber: nouvelleTable.trim(),
        reservedAt: nouvelleDate,
        excluId: id, // ne pas se compter soi-meme
      });
      if (conflit) {
        const heureConflit = conflit.reservedAt.toLocaleTimeString("fr-FR", {
          hour: "2-digit", minute: "2-digit",
        });
        throw new BadRequestException(
          `Conflit : la table "${nouvelleTable.trim()}" est deja reservee pour ` +
            `${conflit.customerName} a ${heureConflit} (a moins de 90 min).`,
        );
      }
    }

    const row = await this.repo.modifier(tenantId, id, data);

    // ─── Audit log (fix I2) ───────────────────────────────────────────
    if (dto.statut && dto.statut !== existant.status) {
      await this.audit.log({
        tenantId, userId, action: AUDIT_ACTIONS.RESERVATION_STATUS_CHANGED,
        entityType: "RESERVATION", entityId: id,
        before: { status: existant.status },
        after: { status: dto.statut },
      });
    } else {
      await this.audit.log({
        tenantId, userId, action: AUDIT_ACTIONS.RESERVATION_UPDATED,
        entityType: "RESERVATION", entityId: id,
        before: { table: existant.tableNumber, date: existant.reservedAt },
        after: data,
      });
    }

    this.realtime.emitToTenant(tenantId, "reservation.changed", {
      reservationId: row.id, action: "updated",
    });

    // Module 10 D2 : si le statut a change, notifier le client.
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
      antiDoublon: type === "reservation_created",
      payload: { type, statut: nouveauStatut },
    });
  }

  async supprimer(tenantId: string, userId: string, id: string): Promise<void> {
    const existant = await this.repo.trouver(tenantId, id);
    if (!existant) throw new NotFoundException("Reservation introuvable");
    await this.repo.supprimer(tenantId, id);

    // Module 12 D2 (I4) : si la reservation etait active, notifier le
    // client comme annulee (template "reservationStatusChanged" + CANCELLED).
    const etaitActive = ["PENDING", "CONFIRMED", "SEATED"].includes(existant.status);
    if (etaitActive) {
      this.envoyerNotifReservation(tenantId, id, "reservation_status", "CANCELLED")
        .catch((err) => console.error("[notif reservation.deleted] echoue:", err));
    }

    // Audit log
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.RESERVATION_DELETED,
      entityType: "RESERVATION", entityId: id,
      before: {
        statut: existant.status, nomClient: existant.customerName,
        date: existant.reservedAt,
      },
    });

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
