import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PromotionService } from "./promotion.service";
import { PromotionRepository } from "./repositories/promotion.repository";
import { AuditService } from "../../common/audit/audit.service";

/**
 * Module 11 D1 : tests du PromotionService.
 * Couvre :
 * - CRUD avec conflits + audit log
 * - Validation (date, montant min, limite globale, perClient, plafond)
 * - Application atomique (race-safe sur usage_limit)
 * - Liberation usages a l'annulation
 * - Recalcul cote serveur (fix I2)
 */
describe("PromotionService", () => {
  let service: PromotionService;
  let repoMock: jest.Mocked<PromotionRepository>;
  let auditMock: jest.Mocked<AuditService>;

  beforeEach(async () => {
    repoMock = {
      creer: jest.fn(),
      lister: jest.fn(),
      trouverParId: jest.fn(),
      trouverParCode: jest.fn(),
      modifier: jest.fn(),
      supprimer: jest.fn(),
      incrementerUsage: jest.fn(),
      incrementerUsageAtomique: jest.fn(),
      decrementerUsage: jest.fn(),
      compterUsagesClient: jest.fn(),
      enregistrerUsage: jest.fn(),
      usagesParTicket: jest.fn(),
      supprimerUsagesTicket: jest.fn(),
    } as unknown as jest.Mocked<PromotionRepository>;

    auditMock = {
      log: jest.fn().mockResolvedValue(undefined),
      logCreate: jest.fn(),
      logUpdate: jest.fn(),
      logDelete: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: PromotionRepository, useValue: repoMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = moduleRef.get(PromotionService);
  });

  // ────────────────────────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────────────────────────
  describe("creer", () => {
    it("uppercase le code + audit log", async () => {
      repoMock.trouverParCode.mockResolvedValue(undefined as any);
      repoMock.creer.mockResolvedValue({
        id: "p1", code: "RENTREE10", type: "PERCENTAGE", value: "10",
        minPurchaseAmount: "0", maxDiscountAmount: null,
        validFrom: null, validTo: null,
        usageLimit: null, usageCount: 0, perCustomerLimit: null,
        isActive: true, createdAt: new Date(), description: null,
      } as any);

      await service.creer("t1", "u1", {
        code: "  rentree10  ", type: "PERCENTAGE", valeur: 10,
      });

      expect(repoMock.creer).toHaveBeenCalledWith(expect.objectContaining({ code: "RENTREE10" }));
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "PROMOTION_CREATED", entityType: "PROMOTION",
      }));
    });

    it("rejette si le code existe deja (conflict)", async () => {
      repoMock.trouverParCode.mockResolvedValue({ id: "existant" } as any);

      await expect(service.creer("t1", "u1", {
        code: "RENTREE10", type: "PERCENTAGE", valeur: 10,
      })).rejects.toThrow(ConflictException);
    });
  });

  describe("modifier", () => {
    it("rejette si promotion introuvable", async () => {
      repoMock.trouverParId.mockResolvedValue(undefined as any);
      await expect(service.modifier("t1", "u1", "p1", { actif: false }))
        .rejects.toThrow(NotFoundException);
    });

    it("audit log les changements", async () => {
      repoMock.trouverParId.mockResolvedValue({
        id: "p1", code: "OLD", isActive: true,
      } as any);
      repoMock.modifier.mockResolvedValue({
        id: "p1", code: "OLD", isActive: false,
        type: "PERCENTAGE", value: "10",
        minPurchaseAmount: "0", maxDiscountAmount: null,
        validFrom: null, validTo: null,
        usageLimit: null, usageCount: 0, perCustomerLimit: null,
        createdAt: new Date(), description: null,
      } as any);

      await service.modifier("t1", "u1", "p1", { actif: false });

      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "PROMOTION_UPDATED",
      }));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────────────────────────
  describe("valider", () => {
    function makePromo(overrides: any = {}) {
      return {
        id: "p1", code: "TEST", type: "PERCENTAGE", value: "10",
        minPurchaseAmount: "0", maxDiscountAmount: null,
        validFrom: null, validTo: null,
        usageLimit: null, usageCount: 0, perCustomerLimit: null,
        isActive: true, deletedAt: null,
        createdAt: new Date(), description: null,
        ...overrides,
      };
    }

    it("rejette un code inconnu", async () => {
      repoMock.trouverParCode.mockResolvedValue(undefined as any);
      const r = await service.valider("t1", { code: "X", montantTicket: 10000 });
      expect(r.valide).toBe(false);
      expect(r.raison).toMatch(/inconnu/i);
    });

    it("rejette un code desactive", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({ isActive: false }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000 });
      expect(r.valide).toBe(false);
      expect(r.raison).toMatch(/desactive/i);
    });

    it("rejette un code expire", async () => {
      const passe = new Date(Date.now() - 86400000);
      repoMock.trouverParCode.mockResolvedValue(makePromo({ validTo: passe }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000 });
      expect(r.valide).toBe(false);
      expect(r.raison).toMatch(/expire/i);
    });

    it("rejette si le montant min n'est pas atteint", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({ minPurchaseAmount: "20000" }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 5000 });
      expect(r.valide).toBe(false);
      expect(r.raison).toMatch(/Montant minimum/i);
    });

    it("rejette si la limite globale est atteinte", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({ usageLimit: 10, usageCount: 10 }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000 });
      expect(r.valide).toBe(false);
      expect(r.raison).toMatch(/Limite/i);
    });

    it("rejette si la limite par client est atteinte", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({ perCustomerLimit: 1 }) as any);
      repoMock.compterUsagesClient.mockResolvedValue(1);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000, clientId: "c1" });
      expect(r.valide).toBe(false);
      expect(r.raison).toMatch(/client/i);
    });

    it("calcule correctement une remise PERCENTAGE", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({ type: "PERCENTAGE", value: "10" }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000 });
      expect(r.valide).toBe(true);
      expect(r.remise).toBe(1000);
    });

    it("plafonne une remise PERCENTAGE par maxDiscountAmount", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({
        type: "PERCENTAGE", value: "50", maxDiscountAmount: "3000",
      }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000 });
      expect(r.valide).toBe(true);
      // 50% de 10000 = 5000, plafonne a 3000
      expect(r.remise).toBe(3000);
    });

    it("calcule une remise FIXED_AMOUNT", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({
        type: "FIXED_AMOUNT", value: "2000",
      }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 10000 });
      expect(r.valide).toBe(true);
      expect(r.remise).toBe(2000);
    });

    it("ne depasse jamais le montant du ticket (FIXED_AMOUNT > total)", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo({
        type: "FIXED_AMOUNT", value: "99999",
      }) as any);
      const r = await service.valider("t1", { code: "TEST", montantTicket: 5000 });
      expect(r.valide).toBe(true);
      expect(r.remise).toBe(5000);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Application atomique (fix C1+C2+I2)
  // ────────────────────────────────────────────────────────────────────
  describe("appliquerAuTicketEnVerifiant", () => {
    function makePromo(overrides: any = {}) {
      return {
        id: "p1", code: "TEST", type: "PERCENTAGE", value: "10",
        minPurchaseAmount: "0", maxDiscountAmount: null,
        validFrom: null, validTo: null,
        usageLimit: null, usageCount: 0, perCustomerLimit: null,
        isActive: true, deletedAt: null,
        createdAt: new Date(), description: null,
        ...overrides,
      };
    }

    it("retourne 0 si la promo est devenue invalide (expire entre saisie et completer)", async () => {
      const passe = new Date(Date.now() - 86400000);
      repoMock.trouverParCode.mockResolvedValue(makePromo({ validTo: passe }) as any);

      const remise = await service.appliquerAuTicketEnVerifiant(
        "t1", "u1", "TEST", "ticket-1", undefined, 10000,
      );

      expect(remise).toBe(0);
      expect(repoMock.incrementerUsageAtomique).not.toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "PROMOTION_APPLY_FAILED",
      }));
    });

    it("retourne 0 si l'increment atomique echoue (limite globale atteinte par race)", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo() as any);
      repoMock.incrementerUsageAtomique.mockResolvedValue(false);

      const remise = await service.appliquerAuTicketEnVerifiant(
        "t1", "u1", "TEST", "ticket-1", undefined, 10000,
      );

      expect(remise).toBe(0);
      expect(repoMock.enregistrerUsage).not.toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "PROMOTION_APPLY_FAILED",
        after: expect.objectContaining({ raison: expect.stringMatching(/race/i) }),
      }));
    });

    it("applique la remise + enregistre usage + audit en cas de succes", async () => {
      repoMock.trouverParCode.mockResolvedValue(makePromo() as any);
      repoMock.incrementerUsageAtomique.mockResolvedValue(true);

      const remise = await service.appliquerAuTicketEnVerifiant(
        "t1", "u1", "TEST", "ticket-1", "c1", 10000,
      );

      expect(remise).toBe(1000);
      expect(repoMock.incrementerUsageAtomique).toHaveBeenCalledWith("p1");
      expect(repoMock.enregistrerUsage).toHaveBeenCalledWith(expect.objectContaining({
        promotionId: "p1", ticketId: "ticket-1", customerId: "c1",
        discountAmount: "1000",
      }));
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({
        action: "PROMOTION_APPLIED",
      }));
    });

    it("ne leve jamais meme si le repo throw", async () => {
      repoMock.trouverParCode.mockRejectedValue(new Error("DB down"));

      await expect(service.appliquerAuTicketEnVerifiant(
        "t1", "u1", "TEST", "ticket-1", undefined, 10000,
      )).resolves.toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Liberation usages (D2)
  // ────────────────────────────────────────────────────────────────────
  describe("libererUsagesTicket", () => {
    it("decremente le compteur pour chaque usage du ticket", async () => {
      (repoMock.usagesParTicket as jest.Mock).mockResolvedValue([
        { promotionId: "p1" }, { promotionId: "p2" },
      ]);

      await service.libererUsagesTicket("t1", "ticket-1");

      expect(repoMock.decrementerUsage).toHaveBeenCalledWith("p1");
      expect(repoMock.decrementerUsage).toHaveBeenCalledWith("p2");
      expect(repoMock.supprimerUsagesTicket).toHaveBeenCalledWith("ticket-1");
    });

    it("ne fait rien si pas d'usages", async () => {
      (repoMock.usagesParTicket as jest.Mock).mockResolvedValue([]);

      await service.libererUsagesTicket("t1", "ticket-1");

      expect(repoMock.decrementerUsage).not.toHaveBeenCalled();
      expect(repoMock.supprimerUsagesTicket).not.toHaveBeenCalled();
    });

    it("absorbe les erreurs sans lever", async () => {
      (repoMock.usagesParTicket as jest.Mock).mockRejectedValue(new Error("DB"));

      await expect(service.libererUsagesTicket("t1", "ticket-1"))
        .resolves.toBeUndefined();
    });
  });
});
