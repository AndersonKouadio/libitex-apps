import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AchatService } from "./achat.service";
import { AchatRepository } from "./repositories/achat.repository";
import { RealtimeGateway } from "../realtime/realtime.gateway";

describe("AchatService", () => {
  let service: AchatService;
  let repoMock: jest.Mocked<AchatRepository>;
  let realtimeMock: jest.Mocked<RealtimeGateway>;

  beforeEach(async () => {
    repoMock = {
      creerFournisseur: jest.fn(),
      trouverFournisseur: jest.fn(),
      variantesDuTenant: jest.fn(),
      emplacementDuTenant: jest.fn(),
      prochainNumeroCommande: jest.fn(),
      genererNumeroCommande: jest.fn(),
      estViolationUniqueOrderNumber: jest.fn().mockReturnValue(false),
      creerCommande: jest.fn(),
      ajouterLignes: jest.fn(),
      trouverCommande: jest.fn(),
      listerLignesCommande: jest.fn(),
      modifierStatutCommande: jest.fn(),
      appliquerReceptionAtomique: jest.fn(),
    } as unknown as jest.Mocked<AchatRepository>;

    realtimeMock = {
      emitToTenant: jest.fn(),
    } as unknown as jest.Mocked<RealtimeGateway>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AchatService,
        { provide: AchatRepository, useValue: repoMock },
        { provide: RealtimeGateway, useValue: realtimeMock },
      ],
    }).compile();

    service = moduleRef.get(AchatService);
  });

  describe("creerCommande", () => {
    it("refuse si le fournisseur n'existe pas", async () => {
      repoMock.trouverFournisseur.mockResolvedValue(undefined as any);

      await expect(service.creerCommande("t1", "u1", {
        fournisseurId: "f-inexistant",
        emplacementId: "e1",
        lignes: [{ varianteId: "v1", quantite: 1, prixUnitaire: 100 }],
      })).rejects.toThrow(BadRequestException);
    });

    it("refuse si l'emplacement n'appartient pas au tenant (fix I9)", async () => {
      repoMock.trouverFournisseur.mockResolvedValue({ id: "f1" } as any);
      repoMock.emplacementDuTenant.mockResolvedValue(undefined as any);

      await expect(service.creerCommande("t1", "u1", {
        fournisseurId: "f1",
        emplacementId: "e-autre-tenant",
        lignes: [{ varianteId: "v1", quantite: 1, prixUnitaire: 100 }],
      })).rejects.toThrow(ForbiddenException);
    });

    it("refuse si une variante n'appartient pas au tenant (fix C3 cross-tenant)", async () => {
      repoMock.trouverFournisseur.mockResolvedValue({ id: "f1" } as any);
      repoMock.emplacementDuTenant.mockResolvedValue({ id: "e1" } as any);
      // v2 absente du Set retourne -> cross-tenant
      repoMock.variantesDuTenant.mockResolvedValue(new Set(["v1"]));

      await expect(service.creerCommande("t1", "u1", {
        fournisseurId: "f1",
        emplacementId: "e1",
        lignes: [
          { varianteId: "v1", quantite: 1, prixUnitaire: 100 },
          { varianteId: "v2", quantite: 1, prixUnitaire: 100 },
        ],
      })).rejects.toThrow(ForbiddenException);
    });

    it("calcule le total a partir des lignes", async () => {
      repoMock.trouverFournisseur.mockResolvedValue({ id: "f1" } as any);
      repoMock.emplacementDuTenant.mockResolvedValue({ id: "e1" } as any);
      repoMock.variantesDuTenant.mockResolvedValue(new Set(["v1", "v2"]));
      repoMock.prochainNumeroCommande.mockResolvedValue("BC-20260512-001");
      repoMock.creerCommande.mockResolvedValue({ id: "c1" } as any);
      repoMock.trouverCommande.mockResolvedValue({
        id: "c1", supplierId: "f1", orderNumber: "BC-20260512-001",
        status: "DRAFT", totalAmount: "750", locationId: "e1",
        expectedDate: null, receivedAt: null, notes: null,
        createdAt: new Date(),
      } as any);
      repoMock.listerLignesCommande.mockResolvedValue([]);

      await service.creerCommande("t1", "u1", {
        fournisseurId: "f1",
        emplacementId: "e1",
        lignes: [
          { varianteId: "v1", quantite: 2, prixUnitaire: 100 },
          { varianteId: "v2", quantite: 5, prixUnitaire: 110 },
        ],
      });

      // 2*100 + 5*110 = 750
      expect(repoMock.creerCommande).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: "750.00" }),
      );
    });

    it("retry sur conflit UNIQUE puis succede (fix C4)", async () => {
      repoMock.trouverFournisseur.mockResolvedValue({ id: "f1" } as any);
      repoMock.emplacementDuTenant.mockResolvedValue({ id: "e1" } as any);
      repoMock.variantesDuTenant.mockResolvedValue(new Set(["v1"]));
      repoMock.prochainNumeroCommande
        .mockResolvedValueOnce("BC-20260512-001")
        .mockResolvedValueOnce("BC-20260512-002");
      // 1er creerCommande throw uniqueViolation, 2e succede
      const uniqueErr = Object.assign(new Error("unique"), { code: "23505", constraint: "idx_purchase_orders_number" });
      repoMock.creerCommande
        .mockRejectedValueOnce(uniqueErr)
        .mockResolvedValueOnce({ id: "c1" } as any);
      repoMock.estViolationUniqueOrderNumber.mockReturnValue(true);
      repoMock.trouverCommande.mockResolvedValue({
        id: "c1", supplierId: "f1", orderNumber: "BC-20260512-002",
        status: "DRAFT", totalAmount: "100", locationId: "e1",
        expectedDate: null, receivedAt: null, notes: null,
        createdAt: new Date(),
      } as any);
      repoMock.listerLignesCommande.mockResolvedValue([]);

      const res = await service.creerCommande("t1", "u1", {
        fournisseurId: "f1",
        emplacementId: "e1",
        lignes: [{ varianteId: "v1", quantite: 1, prixUnitaire: 100 }],
      });

      expect(res.numero).toBe("BC-20260512-002");
      expect(repoMock.prochainNumeroCommande).toHaveBeenCalledTimes(2);
    });
  });

  describe("receptionner", () => {
    const commandeBase = {
      id: "c1",
      tenantId: "t1",
      orderNumber: "BC-20260512-001",
      supplierId: "f1",
      locationId: "e1",
      status: "SENT",
      receivedAt: null,
      totalAmount: "1000",
      expectedDate: null,
      notes: null,
      createdAt: new Date(),
    };

    const lignesBase = [
      {
        id: "l1", variantId: "v1", productName: "P1",
        quantityOrdered: "10", quantityReceived: "0",
        unitPrice: "100", lineTotal: "1000",
      },
    ];

    it("refuse de receptionner une commande deja RECEIVED", async () => {
      repoMock.trouverCommande.mockResolvedValue({
        ...commandeBase, status: "RECEIVED",
      } as any);

      await expect(service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
      })).rejects.toThrow(/deja recue/);
    });

    it("refuse de receptionner une commande CANCELLED", async () => {
      repoMock.trouverCommande.mockResolvedValue({
        ...commandeBase, status: "CANCELLED",
      } as any);

      await expect(service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
      })).rejects.toThrow(/annulee/);
    });

    it("refuse de recevoir plus que la quantite commandee", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande.mockResolvedValue(lignesBase as any);

      await expect(service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 12 }],
      })).rejects.toThrow(/> commande/);
    });

    it("bascule en PARTIAL quand on recoit une partie (atomique via batch)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
      });

      // Fix C1 : un seul appel atomique qui inclut le passage en PARTIAL
      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({
          nouveauStatut: "PARTIAL",
          mouvements: [{ variantId: "v1", quantity: "5" }],
          lignes: [{ ligneId: "l1", quantiteRecue: "5" }],
        }),
      );
    });

    it("bascule en RECEIVED quand on recoit tout", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "10" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 10 }],
      });

      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({ nouveauStatut: "RECEIVED" }),
      );
    });

    it("met a jour le prix d'achat si majPrixAchat=true (dans le batch)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
        majPrixAchat: true,
      });

      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({
          prixAchat: [{ variantId: "v1", prix: "100" }],
        }),
      );
    });

    it("emit realtime avec variantIds precis (fix C5)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
      });

      expect(realtimeMock.emitToTenant).toHaveBeenCalledWith(
        "t1",
        "stock.updated",
        expect.objectContaining({ variantIds: ["v1"] }),
      );
    });
  });
});
