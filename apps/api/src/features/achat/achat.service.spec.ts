import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AchatService } from "./achat.service";
import { AchatRepository } from "./repositories/achat.repository";
import { LandedCostService } from "./services/landed-cost.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";

describe("AchatService", () => {
  let service: AchatService;
  let repoMock: jest.Mocked<AchatRepository>;
  let realtimeMock: jest.Mocked<RealtimeGateway>;
  let notificationsMock: jest.Mocked<NotificationsService>;
  let landedCostMock: jest.Mocked<LandedCostService>;

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
      stockTotalParVariante: jest.fn().mockResolvedValue(new Map()),
      prixAchatActuelParVariante: jest.fn().mockResolvedValue(new Map()),
      obtenirContexteEnvoiBdC: jest.fn(),
      // Phase A.2 : mocks pour les frais d'approche
      listerFraisCommande: jest.fn().mockResolvedValue([]),
      ajouterFraisCommande: jest.fn(),
      modifierFraisCommande: jest.fn(),
      supprimerFraisCommande: jest.fn(),
      sommerFraisCommande: jest.fn().mockResolvedValue(0),
      majTotauxCommande: jest.fn(),
      majLandedLigne: jest.fn(),
      obtenirContexteCump: jest.fn(),
      majCump: jest.fn(),
      obtenirPoidsVariantes: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<AchatRepository>;

    realtimeMock = {
      emitToTenant: jest.fn(),
    } as unknown as jest.Mocked<RealtimeGateway>;

    notificationsMock = {
      envoyer: jest.fn(),
      lister: jest.fn(),
      templates: {
        purchaseOrder: jest.fn().mockReturnValue("Bon de commande"),
      } as any,
    } as unknown as jest.Mocked<NotificationsService>;

    landedCostMock = {
      calculerLandedCosts: jest.fn().mockReturnValue([]),
      calculerNouveauCump: jest.fn().mockReturnValue(0),
      appliquerLandedEtRecalculerCump: jest.fn(),
    } as unknown as jest.Mocked<LandedCostService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AchatService,
        { provide: AchatRepository, useValue: repoMock },
        { provide: RealtimeGateway, useValue: realtimeMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: LandedCostService, useValue: landedCostMock },
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

    it("met a jour le prix d'achat si majPrixAchat=true (PMP au premier achat)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);
      // Stock=0, PMP=0 -> PMP nouveau = prix recu (100)
      repoMock.stockTotalParVariante.mockResolvedValue(new Map([["v1", 0]]));
      repoMock.prixAchatActuelParVariante.mockResolvedValue(new Map([["v1", 0]]));

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
        majPrixAchat: true,
      });

      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({
          prixAchat: [{ variantId: "v1", prix: "100.00" }],
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

    it("ignore les lignes a quantite <= 0 (lignes mixtes)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      const lignesMixtes = [
        ...lignesBase,
        { id: "l2", variantId: "v2", productName: "P2",
          quantityOrdered: "5", quantityReceived: "0", unitPrice: "200", lineTotal: "1000" },
      ];
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesMixtes as any)
        .mockResolvedValueOnce([
          { ...lignesMixtes[0], quantityReceived: "5" },
          lignesMixtes[1],
        ] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [
          { ligneId: "l1", quantite: 5 },
          { ligneId: "l2", quantite: 0 },  // ignoree
          { ligneId: "l2", quantite: -1 }, // ignoree (negative)
        ],
      });

      // Seulement la l1 est dans les mouvements
      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({
          mouvements: [{ variantId: "v1", quantity: "5" }],
        }),
      );
    });

    it("ne touche pas le statut quand rien a receptionner (toutes lignes a 0)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      // Premier appel pour la verification + 2e appel via obtenirCommande
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce(lignesBase as any);
      repoMock.trouverFournisseur.mockResolvedValue({ id: "f1", name: "F" } as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 0 }],
      });

      // appliquerReceptionAtomique n'est pas appele
      expect(repoMock.appliquerReceptionAtomique).not.toHaveBeenCalled();
    });

    it("calcule le PMP au premier achat (stock=0 -> prix recu)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "10" }] as any);
      // Stock initial = 0, PMP initial = 0
      repoMock.stockTotalParVariante.mockResolvedValue(new Map([["v1", 0]]));
      repoMock.prixAchatActuelParVariante.mockResolvedValue(new Map([["v1", 0]]));

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 10 }],
        majPrixAchat: true,
      });

      // PMP au premier achat = prix recu (100). Stocke en string 2 decimales.
      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({
          prixAchat: [{ variantId: "v1", prix: "100.00" }],
        }),
      );
    });

    it("calcule le PMP avec stock existant (moyenne ponderee)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "10" }] as any);
      // Stock existant : 5 unites a 80F (PMP courant)
      // Reception : 10 unites a 100F
      // PMP nouveau = (5 * 80 + 10 * 100) / (5 + 10) = 1400 / 15 = 93.33
      repoMock.stockTotalParVariante.mockResolvedValue(new Map([["v1", 5]]));
      repoMock.prixAchatActuelParVariante.mockResolvedValue(new Map([["v1", 80]]));

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 10 }],
        majPrixAchat: true,
      });

      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({
          prixAchat: [{ variantId: "v1", prix: "93.33" }],
        }),
      );
    });

    it("ne touche pas le prix d'achat si majPrixAchat=false (PMP non recalcule)", async () => {
      repoMock.trouverCommande.mockResolvedValue(commandeBase as any);
      repoMock.listerLignesCommande
        .mockResolvedValueOnce(lignesBase as any)
        .mockResolvedValueOnce([{ ...lignesBase[0], quantityReceived: "5" }] as any);

      await service.receptionner("t1", "u1", "c1", {
        lignes: [{ ligneId: "l1", quantite: 5 }],
        majPrixAchat: false,
      });

      // Prix achat array vide -> aucun update de variants.pricePurchase
      expect(repoMock.appliquerReceptionAtomique).toHaveBeenCalledWith(
        expect.objectContaining({ prixAchat: [] }),
      );
      // Et donc pas d'appel inutile a stockTotal/prixActuel
      expect(repoMock.stockTotalParVariante).not.toHaveBeenCalled();
      expect(repoMock.prixAchatActuelParVariante).not.toHaveBeenCalled();
    });
  });

  describe("modifierStatut CANCELLED (fix C6 soft-delete)", () => {
    it("modifierStatutCommande positionne deletedAt sur CANCELLED", async () => {
      // Ce test verifie l'appel cote service ; le comportement du repo
      // (set deletedAt = now()) est lui-meme teste implicitement via
      // l'integration. Ici on verifie juste que le service appelle bien
      // le repo avec CANCELLED.
      repoMock.trouverCommande.mockResolvedValue({
        id: "c1", supplierId: "f1", orderNumber: "BC-1",
        status: "DRAFT", totalAmount: "100", locationId: "e1",
        expectedDate: null, receivedAt: null, notes: null,
        createdAt: new Date(),
      } as any);
      repoMock.listerLignesCommande.mockResolvedValue([]);

      await service.modifierStatut("t1", "c1", { statut: "CANCELLED" });

      expect(repoMock.modifierStatutCommande).toHaveBeenCalledWith(
        "t1", "c1", "CANCELLED",
      );
    });

    it("rejette le changement de statut sur une commande RECEIVED", async () => {
      repoMock.trouverCommande.mockResolvedValue({
        id: "c1", status: "RECEIVED",
      } as any);

      await expect(service.modifierStatut("t1", "c1", { statut: "CANCELLED" }))
        .rejects.toThrow(/deja recue/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Module 10 D3 : envoi WhatsApp au fournisseur
  // ──────────────────────────────────────────────────────────────────────
  describe("envoyerAuFournisseur", () => {
    it("leve NotFound si la commande n'existe pas", async () => {
      (repoMock.obtenirContexteEnvoiBdC as jest.Mock).mockResolvedValue(null);
      await expect(service.envoyerAuFournisseur("t1", "c-inexistant"))
        .rejects.toThrow(/introuvable/);
    });

    it("leve BadRequest si le fournisseur n'a pas de telephone", async () => {
      (repoMock.obtenirContexteEnvoiBdC as jest.Mock).mockResolvedValue({
        commandeId: "c1", numeroCommande: "BC-1", montantTotal: "1000",
        statut: "DRAFT", nomBoutique: "Test", nomFournisseur: "F",
        telephoneFournisseur: null, nombreLignes: 1,
      });
      await expect(service.envoyerAuFournisseur("t1", "c1"))
        .rejects.toThrow(/telephone/);
    });

    it("envoie le BdC et bascule DRAFT -> SENT", async () => {
      (repoMock.obtenirContexteEnvoiBdC as jest.Mock).mockResolvedValue({
        commandeId: "c1", numeroCommande: "BC-001", montantTotal: "150000",
        statut: "DRAFT", nomBoutique: "Boutique", nomFournisseur: "Fournisseur",
        telephoneFournisseur: "+22507123456", nombreLignes: 5,
      });
      (notificationsMock.envoyer as jest.Mock).mockResolvedValue(true);

      const r = await service.envoyerAuFournisseur("t1", "c1");

      expect(r.envoye).toBe(true);
      expect(notificationsMock.envoyer).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: "t1", canal: "whatsapp", type: "purchase_order",
        destinataire: "+22507123456", entityType: "PURCHASE_ORDER", entityId: "c1",
      }));
      // Statut DRAFT -> SENT
      expect(repoMock.modifierStatutCommande).toHaveBeenCalledWith("t1", "c1", "SENT");
    });

    it("ne bascule pas le statut si deja SENT", async () => {
      (repoMock.obtenirContexteEnvoiBdC as jest.Mock).mockResolvedValue({
        commandeId: "c1", numeroCommande: "BC-001", montantTotal: "1000",
        statut: "SENT", nomBoutique: "B", nomFournisseur: "F",
        telephoneFournisseur: "+22507123456", nombreLignes: 1,
      });
      (notificationsMock.envoyer as jest.Mock).mockResolvedValue(true);

      await service.envoyerAuFournisseur("t1", "c1");

      expect(repoMock.modifierStatutCommande).not.toHaveBeenCalled();
    });

    it("ne bascule pas le statut si l'envoi a echoue", async () => {
      (repoMock.obtenirContexteEnvoiBdC as jest.Mock).mockResolvedValue({
        commandeId: "c1", numeroCommande: "BC-001", montantTotal: "1000",
        statut: "DRAFT", nomBoutique: "B", nomFournisseur: "F",
        telephoneFournisseur: "+22507123456", nombreLignes: 1,
      });
      (notificationsMock.envoyer as jest.Mock).mockResolvedValue(false);

      const r = await service.envoyerAuFournisseur("t1", "c1");

      expect(r.envoye).toBe(false);
      expect(r.raison).toMatch(/Echec/);
      expect(repoMock.modifierStatutCommande).not.toHaveBeenCalled();
    });
  });
});
