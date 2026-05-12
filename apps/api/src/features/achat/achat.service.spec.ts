import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
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
      genererNumeroCommande: jest.fn(),
      creerCommande: jest.fn(),
      ajouterLignes: jest.fn(),
      trouverCommande: jest.fn(),
      listerLignesCommande: jest.fn(),
      enregistrerEntreeReception: jest.fn(),
      modifierLigneRecue: jest.fn(),
      modifierStatutCommande: jest.fn(),
      majPrixAchatVariante: jest.fn(),
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

    it("calcule le total a partir des lignes", async () => {
      repoMock.trouverFournisseur.mockResolvedValue({ id: "f1" } as any);
      repoMock.genererNumeroCommande.mockResolvedValue("BC-20260512-001");
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

      // commande 10, on tente d'en recevoir 12
      await expect(service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 12 }],
      })).rejects.toThrow(/> commande/);
    });

    it("bascule en PARTIAL quand on recoit une partie", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      // 1er appel : avant reception (qtyReceived=0)
      // 2e appel : apres reception (qtyReceived=5)
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any)
        // 3e appel par obtenirCommande pour la reponse finale
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
      });

      expect(repoMock.modifierStatutCommande).toHaveBeenCalledWith(
        "t1", "c1", "PARTIAL", expect.any(Date),
      );
    });

    it("bascule en RECEIVED quand on recoit tout", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "10" }] as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "10" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 10 }],
      });

      expect(repoMock.modifierStatutCommande).toHaveBeenCalledWith(
        "t1", "c1", "RECEIVED", expect.any(Date),
      );
    });

    it("met a jour le prix d'achat si majPrixAchat=true", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
        majPrixAchat: true,
      });

      expect(repoMock.majPrixAchatVariante).toHaveBeenCalledWith("v1", "100");
    });
  });
});
