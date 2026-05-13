import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { LocationSettingsService } from "./location-settings.service";
import { LocationSettingsRepository } from "./repositories/location-settings.repository";

/**
 * Module 15 D1 : tests LocationSettingsService.
 * Couvre :
 * - cross-tenant guard sur lecture + ecriture
 * - obtenir() retourne defaults vides si aucun override
 * - modifier() upsert
 * - obtenirEffectif() merge correct
 */
describe("LocationSettingsService", () => {
  let service: LocationSettingsService;
  let repoMock: jest.Mocked<LocationSettingsRepository>;

  beforeEach(async () => {
    repoMock = {
      trouver: jest.fn(),
      emplacementAppartientTenant: jest.fn().mockResolvedValue(true),
      upsert: jest.fn(),
      obtenirEffectif: jest.fn(),
    } as unknown as jest.Mocked<LocationSettingsRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        LocationSettingsService,
        { provide: LocationSettingsRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(LocationSettingsService);
  });

  describe("obtenir", () => {
    it("rejette cross-tenant (emplacement d'un autre tenant)", async () => {
      repoMock.emplacementAppartientTenant.mockResolvedValue(false);
      await expect(service.obtenir("t1", "loc-autre-tenant"))
        .rejects.toThrow(ForbiddenException);
    });

    it("retourne defaults vides si aucune ligne settings", async () => {
      (repoMock.trouver as jest.Mock).mockResolvedValue(undefined);
      const r = await service.obtenir("t1", "loc-1");
      expect(r).toEqual({
        locationId: "loc-1",
        taxRateOverride: null,
        paymentMethodsOverride: null,
        ticketFooterMessage: null,
        autoPrintDefault: false,
        preferredPrinterSignature: null,
        notes: null,
      });
    });

    it("map correctement les valeurs si ligne presente", async () => {
      (repoMock.trouver as jest.Mock).mockResolvedValue({
        locationId: "loc-1",
        taxRateOverride: "5.5",
        paymentMethodsOverride: ["CASH", "MOBILE_MONEY"],
        ticketFooterMessage: "Merci !",
        autoPrintDefault: true,
        preferredPrinterSignature: "0x04b8:0x0202",
        notes: "Imprimante au comptoir 2",
      });
      const r = await service.obtenir("t1", "loc-1");
      expect(r.taxRateOverride).toBe(5.5);
      expect(r.paymentMethodsOverride).toEqual(["CASH", "MOBILE_MONEY"]);
      expect(r.ticketFooterMessage).toBe("Merci !");
      expect(r.autoPrintDefault).toBe(true);
    });
  });

  describe("modifier", () => {
    it("rejette cross-tenant", async () => {
      repoMock.emplacementAppartientTenant.mockResolvedValue(false);
      await expect(service.modifier("t1", "loc-autre", { taxRateOverride: 18 }))
        .rejects.toThrow(ForbiddenException);
      expect(repoMock.upsert).not.toHaveBeenCalled();
    });

    it("upsert avec les overrides fournis", async () => {
      (repoMock.upsert as jest.Mock).mockResolvedValue({
        locationId: "loc-1", taxRateOverride: "0",
        paymentMethodsOverride: ["CASH"], autoPrintDefault: true,
        ticketFooterMessage: null, preferredPrinterSignature: null, notes: null,
      });

      const r = await service.modifier("t1", "loc-1", {
        taxRateOverride: 0,
        paymentMethodsOverride: ["CASH"],
        autoPrintDefault: true,
      });

      expect(repoMock.upsert).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: "t1", locationId: "loc-1",
        taxRateOverride: 0, paymentMethodsOverride: ["CASH"],
        autoPrintDefault: true,
      }));
      expect(r.taxRateOverride).toBe(0);
    });

    it("null efface l'override (revient au defaut tenant)", async () => {
      (repoMock.upsert as jest.Mock).mockResolvedValue({
        locationId: "loc-1", taxRateOverride: null,
        paymentMethodsOverride: null, autoPrintDefault: false,
        ticketFooterMessage: null, preferredPrinterSignature: null, notes: null,
      });

      const r = await service.modifier("t1", "loc-1", { taxRateOverride: null });
      expect(repoMock.upsert).toHaveBeenCalledWith(expect.objectContaining({
        taxRateOverride: null,
      }));
      expect(r.taxRateOverride).toBe(null);
    });
  });

  describe("obtenirEffectif", () => {
    it("rejette NotFound si la location est inconnue ou cross-tenant", async () => {
      (repoMock.obtenirEffectif as jest.Mock).mockResolvedValue(undefined);
      await expect(service.obtenirEffectif("t1", "loc-inexistant"))
        .rejects.toThrow(NotFoundException);
    });

    it("retourne TVA override si definie", async () => {
      (repoMock.obtenirEffectif as jest.Mock).mockResolvedValue({
        locationId: "loc-1",
        taxRate: "0",  // override location
        paymentMethods: ["CASH", "MOBILE_MONEY"],
        ticketFooterMessage: "Merci",
        autoPrintDefault: true,
        preferredPrinterSignature: null,
      });

      const r = await service.obtenirEffectif("t1", "loc-1");
      expect(r.taxRate).toBe(0);
      expect(r.paymentMethods).toEqual(["CASH", "MOBILE_MONEY"]);
      expect(r.ticketFooterMessage).toBe("Merci");
      expect(r.autoPrintDefault).toBe(true);
    });

    it("retourne TVA tenant si pas d'override location", async () => {
      // Le repo simule COALESCE deja resolu cote SQL
      (repoMock.obtenirEffectif as jest.Mock).mockResolvedValue({
        locationId: "loc-1",
        taxRate: "18",  // valeur tenant car override null
        paymentMethods: ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"],
        ticketFooterMessage: null,
        autoPrintDefault: false,
        preferredPrinterSignature: null,
      });

      const r = await service.obtenirEffectif("t1", "loc-1");
      expect(r.taxRate).toBe(18);
    });

    it("retourne defaults si tout est null (cas degrade)", async () => {
      (repoMock.obtenirEffectif as jest.Mock).mockResolvedValue({
        locationId: "loc-1",
        taxRate: null,
        paymentMethods: null,
        ticketFooterMessage: null,
        autoPrintDefault: null,
        preferredPrinterSignature: null,
      });

      const r = await service.obtenirEffectif("t1", "loc-1");
      expect(r.taxRate).toBe(0);
      expect(r.paymentMethods).toEqual(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"]);
      expect(r.autoPrintDefault).toBe(false);
    });
  });
});
