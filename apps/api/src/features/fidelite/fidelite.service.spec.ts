import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { FideliteService } from "./fidelite.service";
import { FideliteRepository } from "./repositories/fidelite.repository";

describe("FideliteService", () => {
  let service: FideliteService;
  let repoMock: jest.Mocked<FideliteRepository>;

  beforeEach(async () => {
    repoMock = {
      obtenirOuCreerConfig: jest.fn(),
      modifierConfig: jest.fn(),
      ajouterTransaction: jest.fn(),
      solde: jest.fn(),
      historique: jest.fn(),
      clientAppartientTenant: jest.fn().mockResolvedValue(true),
      estViolationUniqueLoyalty: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<FideliteRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FideliteService,
        { provide: FideliteRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(FideliteService);
  });

  describe("crediterDepuisTicket", () => {
    it("ne credite rien si le programme est inactif", async () => {
      repoMock.obtenirOuCreerConfig.mockResolvedValue({
        isActive: false, earnAmount: "100",
      } as any);

      await service.crediterDepuisTicket("t1", "c1", "tk1", 10000);

      expect(repoMock.ajouterTransaction).not.toHaveBeenCalled();
    });

    it("calcule correctement les points selon le ratio", async () => {
      repoMock.obtenirOuCreerConfig.mockResolvedValue({
        isActive: true, earnAmount: "100",
      } as any);

      await service.crediterDepuisTicket("t1", "c1", "tk1", 10000);

      expect(repoMock.ajouterTransaction).toHaveBeenCalledWith({
        tenantId: "t1",
        customerId: "c1",
        points: 100,
        transactionType: "EARN",
        ticketId: "tk1",
      });
    });

    it("arrondit a l'entier inferieur (550 F = 5 points)", async () => {
      repoMock.obtenirOuCreerConfig.mockResolvedValue({
        isActive: true, earnAmount: "100",
      } as any);

      await service.crediterDepuisTicket("t1", "c1", "tk1", 550);

      expect(repoMock.ajouterTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ points: 5 }),
      );
    });

    it("ne credite rien si le montant est trop faible (< 1 point)", async () => {
      repoMock.obtenirOuCreerConfig.mockResolvedValue({
        isActive: true, earnAmount: "100",
      } as any);

      await service.crediterDepuisTicket("t1", "c1", "tk1", 50);

      expect(repoMock.ajouterTransaction).not.toHaveBeenCalled();
    });

    it("degrade silencieusement sur replay (fix C4 idempotence)", async () => {
      repoMock.obtenirOuCreerConfig.mockResolvedValue({
        isActive: true, earnAmount: "100",
      } as any);
      const uniqueErr = Object.assign(new Error("dup"), { code: "23505", constraint: "idx_loyalty_tx_unique" });
      repoMock.ajouterTransaction.mockRejectedValueOnce(uniqueErr);
      repoMock.estViolationUniqueLoyalty.mockReturnValueOnce(true);

      // Ne doit pas throw — replay silencieux
      await expect(service.crediterDepuisTicket("t1", "c1", "tk1", 10000))
        .resolves.toBeUndefined();
    });
  });

  describe("solde + tenant check (fix C3)", () => {
    it("retourne le solde + l'equivalent en F CFA", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(true);
      repoMock.solde.mockResolvedValue(250);
      repoMock.obtenirOuCreerConfig.mockResolvedValue({ redeemValue: "5" } as any);

      const r = await service.solde("t1", "c1");

      expect(r).toEqual({ solde: 250, valeurEnFcfa: 1250 });
    });

    it("rejette si le client n'appartient pas au tenant (fix C3 cross-tenant)", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(false);

      await expect(service.solde("t-attaquant", "c-victime"))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe("historique + tenant check (fix C3)", () => {
    it("rejette le cross-tenant", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(false);

      await expect(service.historique("t1", "c-autre-tenant"))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe("ajusterPoints", () => {
    it("refuse un ajustement de zero point", async () => {
      await expect(service.ajusterPoints("t1", "u1", "c1", { points: 0 }))
        .rejects.toThrow(/zero/i);
    });

    it("rejette le cross-tenant (fix C3)", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(false);

      await expect(service.ajusterPoints("t1", "u1", "c-autre", { points: 50 }))
        .rejects.toThrow(ForbiddenException);
    });

    it("accepte un ajustement negatif si le solde le permet (fix I3)", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(true);
      repoMock.solde.mockResolvedValue(100);

      await service.ajusterPoints("t1", "u1", "c1", { points: -50, note: "test" });

      expect(repoMock.ajouterTransaction).toHaveBeenCalledWith({
        tenantId: "t1",
        customerId: "c1",
        points: -50,
        transactionType: "ADJUST",
        userId: "u1",
        note: "test",
      });
    });

    it("rejette si le debit ferait passer le solde sous zero (fix I3)", async () => {
      repoMock.clientAppartientTenant.mockResolvedValue(true);
      repoMock.solde.mockResolvedValue(30);

      await expect(service.ajusterPoints("t1", "u1", "c1", { points: -50 }))
        .rejects.toThrow(/negatif/i);

      expect(repoMock.ajouterTransaction).not.toHaveBeenCalled();
    });
  });

  describe("ajusterPointsDepuisTicket (paiement LOYALTY)", () => {
    it("ne fait rien si points=0", async () => {
      await service.ajusterPointsDepuisTicket("t1", "c1", "tk1", 0);
      expect(repoMock.ajouterTransaction).not.toHaveBeenCalled();
    });

    it("rejette si solde insuffisant avant le debit (fix C1 + I3)", async () => {
      repoMock.solde.mockResolvedValue(20);

      await expect(service.ajusterPointsDepuisTicket("t1", "c1", "tk1", -50))
        .rejects.toThrow(/insuffisant/i);

      expect(repoMock.ajouterTransaction).not.toHaveBeenCalled();
    });

    it("debite si le solde le permet", async () => {
      repoMock.solde.mockResolvedValue(100);

      await service.ajusterPointsDepuisTicket("t1", "c1", "tk1", -50);

      expect(repoMock.ajouterTransaction).toHaveBeenCalledWith({
        tenantId: "t1",
        customerId: "c1",
        points: -50,
        transactionType: "REDEEM",
        ticketId: "tk1",
      });
    });

    it("est idempotent sur replay (fix C4)", async () => {
      repoMock.solde.mockResolvedValue(100);
      const uniqueErr = Object.assign(new Error("dup"), { code: "23505", constraint: "idx_loyalty_tx_unique" });
      repoMock.ajouterTransaction.mockRejectedValueOnce(uniqueErr);
      repoMock.estViolationUniqueLoyalty.mockReturnValueOnce(true);

      await expect(service.ajusterPointsDepuisTicket("t1", "c1", "tk1", -50))
        .resolves.toBeUndefined();
    });
  });
});
