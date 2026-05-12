import { Test } from "@nestjs/testing";
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

      // 10 000 F / 100 (1 point par 100 F) = 100 points
      await service.crediterDepuisTicket("t1", "c1", "tk1", 10000);

      expect(repoMock.ajouterTransaction).toHaveBeenCalledWith({
        tenantId: "t1",
        customerId: "c1",
        points: 100,
        transactionType: "EARN",
        ticketId: "tk1",
      });
    });

    it("arrondit a l'entier inferieur (550 F = 5 points, pas 5.5)", async () => {
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
  });

  describe("solde", () => {
    it("retourne le solde + l'equivalent en F CFA", async () => {
      repoMock.solde.mockResolvedValue(250);
      repoMock.obtenirOuCreerConfig.mockResolvedValue({
        redeemValue: "5",
      } as any);

      const r = await service.solde("t1", "c1");

      // 250 points x 5 F/point = 1250 F
      expect(r).toEqual({ solde: 250, valeurEnFcfa: 1250 });
    });
  });

  describe("ajusterPoints", () => {
    it("refuse un ajustement de zero point", async () => {
      await expect(service.ajusterPoints("t1", "u1", "c1", { points: 0 }))
        .rejects.toThrow(/zero/i);
    });

    it("accepte un ajustement negatif (debit manuel)", async () => {
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
  });
});
