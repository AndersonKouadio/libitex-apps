import { Test } from "@nestjs/testing";
import {
  BadRequestException, ForbiddenException, NotFoundException,
} from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { ReservationRepository } from "./repositories/reservation.repository";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../../common/audit/audit.service";

/**
 * Module 12 D1 : tests ReservationService.
 * Couvre :
 * - cross-tenant (emplacement + client)
 * - dates passees
 * - conflits horaires (double booking)
 * - state machine transitions
 * - audit log
 * - suppression + notification annulation
 */
describe("ReservationService", () => {
  let service: ReservationService;
  let repoMock: jest.Mocked<ReservationRepository>;
  let realtimeMock: jest.Mocked<RealtimeGateway>;
  let notifMock: jest.Mocked<NotificationsService>;
  let auditMock: jest.Mocked<AuditService>;

  // Date dans le futur pour eviter d'echouer sur le check date passee
  const FUTUR = new Date(Date.now() + 7 * 86400_000); // +7 jours

  beforeEach(async () => {
    repoMock = {
      creer: jest.fn(),
      lister: jest.fn(),
      trouver: jest.fn(),
      modifier: jest.fn(),
      supprimer: jest.fn(),
      resumeJour: jest.fn(),
      emplacementAppartientTenant: jest.fn().mockResolvedValue(true),
      clientAppartientTenant: jest.fn().mockResolvedValue(true),
      detecterConflitHoraire: jest.fn().mockResolvedValue(undefined),
      obtenirContexteNotification: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;

    realtimeMock = {
      emitToTenant: jest.fn(),
    } as unknown as jest.Mocked<RealtimeGateway>;

    notifMock = {
      envoyer: jest.fn().mockResolvedValue(true),
      templates: {
        reservationCreated: jest.fn().mockReturnValue("Confirmation"),
        reservationStatusChanged: jest.fn().mockReturnValue("Statut change"),
      } as any,
    } as unknown as jest.Mocked<NotificationsService>;

    auditMock = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: ReservationRepository, useValue: repoMock },
        { provide: RealtimeGateway, useValue: realtimeMock },
        { provide: NotificationsService, useValue: notifMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = moduleRef.get(ReservationService);
  });

  // ────────────────────────────────────────────────────────────────────
  // Validation date (fix C3)
  // ────────────────────────────────────────────────────────────────────
  describe("creer — validation date", () => {
    it("rejette une date invalide", async () => {
      await expect(service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "X",
        dateReservation: "pas-une-date", nombrePersonnes: 2,
      })).rejects.toThrow(/Date.*invalide/i);
    });

    it("rejette une date dans le passe (au-dela d'1h)", async () => {
      const hier = new Date(Date.now() - 86400_000).toISOString();
      await expect(service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "X",
        dateReservation: hier, nombrePersonnes: 2,
      })).rejects.toThrow(/passe/i);
    });

    it("accepte une date dans la fenetre de tolerance (-30min)", async () => {
      const tot = new Date(Date.now() - 30 * 60_000).toISOString();
      repoMock.creer.mockResolvedValue({ id: "r1", customerName: "X", reservedAt: new Date(tot), status: "PENDING", partySize: 2, locationId: "e1", tableNumber: null, customerPhone: null, customerId: null, notes: null, createdAt: new Date() } as any);

      await expect(service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "X",
        dateReservation: tot, nombrePersonnes: 2,
      })).resolves.toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Cross-tenant (fix C1+C2)
  // ────────────────────────────────────────────────────────────────────
  describe("creer — cross-tenant", () => {
    it("rejette si l'emplacement n'appartient pas au tenant", async () => {
      repoMock.emplacementAppartientTenant.mockResolvedValue(false);

      await expect(service.creer("t1", "u1", {
        emplacementId: "e-autre-tenant", nomClient: "X",
        dateReservation: FUTUR.toISOString(), nombrePersonnes: 2,
      })).rejects.toThrow(ForbiddenException);
    });

    it("rejette si le client n'appartient pas au tenant", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(false);

      await expect(service.creer("t1", "u1", {
        emplacementId: "e1", clientId: "c-autre-tenant", nomClient: "X",
        dateReservation: FUTUR.toISOString(), nombrePersonnes: 2,
      })).rejects.toThrow(ForbiddenException);
    });

    it("ne fait pas de check client si clientId absent", async () => {
      repoMock.creer.mockResolvedValue({ id: "r1", customerName: "X", reservedAt: FUTUR, status: "PENDING", partySize: 2, locationId: "e1", tableNumber: null, customerPhone: null, customerId: null, notes: null, createdAt: new Date() } as any);

      await service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "X",
        dateReservation: FUTUR.toISOString(), nombrePersonnes: 2,
      });

      expect(repoMock.clientAppartientTenant).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Conflit horaire (fix C4)
  // ────────────────────────────────────────────────────────────────────
  describe("creer — conflit horaire", () => {
    it("rejette si une autre reservation existe a moins de 90min sur meme table", async () => {
      repoMock.detecterConflitHoraire.mockResolvedValue({
        id: "r-existant", reservedAt: new Date(FUTUR.getTime() - 30 * 60_000),
        customerName: "Marie",
      } as any);

      await expect(service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "Jean", numeroTable: "Table 4",
        dateReservation: FUTUR.toISOString(), nombrePersonnes: 2,
      })).rejects.toThrow(/Conflit.*Table 4.*Marie/i);
    });

    it("ne check pas le conflit si pas de table assignee", async () => {
      repoMock.creer.mockResolvedValue({ id: "r1", customerName: "X", reservedAt: FUTUR, status: "PENDING", partySize: 2, locationId: "e1", tableNumber: null, customerPhone: null, customerId: null, notes: null, createdAt: new Date() } as any);

      await service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "X",
        dateReservation: FUTUR.toISOString(), nombrePersonnes: 2,
      });

      expect(repoMock.detecterConflitHoraire).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Audit log (fix I2)
  // ────────────────────────────────────────────────────────────────────
  describe("creer — audit log", () => {
    it("audit log RESERVATION_CREATED", async () => {
      repoMock.creer.mockResolvedValue({ id: "r1", customerName: "X", reservedAt: FUTUR, status: "PENDING", partySize: 2, locationId: "e1", tableNumber: null, customerPhone: null, customerId: null, notes: null, createdAt: new Date() } as any);

      await service.creer("t1", "u1", {
        emplacementId: "e1", nomClient: "X",
        dateReservation: FUTUR.toISOString(), nombrePersonnes: 2,
      });

      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "RESERVATION_CREATED", entityType: "RESERVATION",
      }));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // State machine (fix I3)
  // ────────────────────────────────────────────────────────────────────
  describe("modifier — state machine", () => {
    it("rejette une transition interdite (COMPLETED -> PENDING)", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "COMPLETED", reservedAt: FUTUR, locationId: "e1",
        tableNumber: null,
      } as any);

      await expect(service.modifier("t1", "u1", "r1", { statut: "PENDING" }))
        .rejects.toThrow(/Transition.*interdite/i);
    });

    it("rejette CANCELLED -> CONFIRMED", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "CANCELLED", reservedAt: FUTUR, locationId: "e1",
        tableNumber: null,
      } as any);

      await expect(service.modifier("t1", "u1", "r1", { statut: "CONFIRMED" }))
        .rejects.toThrow(/Transition.*interdite/i);
    });

    it("autorise PENDING -> CONFIRMED", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "PENDING", reservedAt: FUTUR, locationId: "e1",
        tableNumber: null, customerName: "X", customerPhone: null, customerId: null,
        partySize: 2, notes: null, createdAt: new Date(),
      } as any);
      repoMock.modifier.mockResolvedValue({
        id: "r1", status: "CONFIRMED", reservedAt: FUTUR, locationId: "e1",
        tableNumber: null, customerName: "X", customerPhone: null, customerId: null,
        partySize: 2, notes: null, createdAt: new Date(),
      } as any);

      await expect(service.modifier("t1", "u1", "r1", { statut: "CONFIRMED" }))
        .resolves.toBeDefined();
    });

    it("audit log RESERVATION_STATUS_CHANGED quand statut change", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "PENDING", reservedAt: FUTUR, locationId: "e1",
        tableNumber: null,
      } as any);
      repoMock.modifier.mockResolvedValue({
        id: "r1", status: "CONFIRMED", reservedAt: FUTUR, locationId: "e1",
        tableNumber: null, customerName: "X", customerPhone: null, customerId: null,
        partySize: 2, notes: null, createdAt: new Date(),
      } as any);

      await service.modifier("t1", "u1", "r1", { statut: "CONFIRMED" });

      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "RESERVATION_STATUS_CHANGED",
        before: { status: "PENDING" }, after: { status: "CONFIRMED" },
      }));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Conflit horaire en modification (fix C4)
  // ────────────────────────────────────────────────────────────────────
  describe("modifier — conflit horaire", () => {
    it("rejette si on change la date vers un creneau deja pris", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "PENDING", reservedAt: FUTUR, locationId: "e1",
        tableNumber: "Table 4", customerName: "X",
      } as any);
      repoMock.detecterConflitHoraire.mockResolvedValue({
        id: "r-autre", reservedAt: FUTUR, customerName: "Marie",
      } as any);

      await expect(service.modifier("t1", "u1", "r1", {
        dateReservation: new Date(FUTUR.getTime() + 3600_000).toISOString(),
      })).rejects.toThrow(/Conflit/i);
    });

    it("passe l'excluId pour ne pas se conflicter soi-meme", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "PENDING", reservedAt: FUTUR, locationId: "e1",
        tableNumber: "Table 4", customerName: "X", customerPhone: null,
        customerId: null, partySize: 2, notes: null, createdAt: new Date(),
      } as any);
      repoMock.modifier.mockResolvedValue({
        id: "r1", status: "PENDING", reservedAt: FUTUR, locationId: "e1",
        tableNumber: "Table 4", customerName: "X", customerPhone: null,
        customerId: null, partySize: 4, notes: null, createdAt: new Date(),
      } as any);

      await service.modifier("t1", "u1", "r1", { nombrePersonnes: 4 });

      expect(repoMock.detecterConflitHoraire).toHaveBeenCalledWith(
        expect.objectContaining({ excluId: "r1" }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Suppression + notification (D2 I4)
  // ────────────────────────────────────────────────────────────────────
  describe("supprimer — notification annulation", () => {
    it("notifie le client si la reservation etait active (CONFIRMED)", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "CONFIRMED", customerName: "X",
        reservedAt: FUTUR, customerPhone: "+22507123456",
      } as any);
      repoMock.obtenirContexteNotification.mockResolvedValue({
        customerPhone: "+22507123456", customerName: "X",
        reservedAt: FUTUR, partySize: 2, tableNumber: null,
        status: "CONFIRMED", nomBoutique: "Resto", clientOptIn: true,
      } as any);

      await service.supprimer("t1", "u1", "r1");

      // attente micro-tick pour que le .catch() async soit appele
      await new Promise(setImmediate);

      expect(notifMock.envoyer).toHaveBeenCalledWith(expect.objectContaining({
        type: "reservation_status",
      }));
    });

    it("ne notifie pas si deja CANCELLED", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "CANCELLED", customerName: "X",
        reservedAt: FUTUR, customerPhone: "+22507123456",
      } as any);

      await service.supprimer("t1", "u1", "r1");

      await new Promise(setImmediate);

      expect(notifMock.envoyer).not.toHaveBeenCalled();
    });

    it("audit log RESERVATION_DELETED", async () => {
      repoMock.trouver.mockResolvedValue({
        id: "r1", status: "PENDING", customerName: "X", reservedAt: FUTUR,
      } as any);

      await service.supprimer("t1", "u1", "r1");

      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "RESERVATION_DELETED",
      }));
    });

    it("rejette NotFound si reservation introuvable", async () => {
      repoMock.trouver.mockResolvedValue(undefined as any);

      await expect(service.supprimer("t1", "u1", "r-inexistant"))
        .rejects.toThrow(NotFoundException);
    });
  });
});
