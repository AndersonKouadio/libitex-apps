import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ShowcaseService } from "./showcase.service";
import { ShowcaseRepository } from "./showcase.repository";

describe("ShowcaseService", () => {
  let service: ShowcaseService;
  let repoMock: jest.Mocked<ShowcaseRepository>;

  beforeEach(async () => {
    repoMock = {
      trouverBoutiqueParSlug: jest.fn(),
      listerProduitsPublics: jest.fn(),
      compterProduitsPublics: jest.fn().mockResolvedValue(0),
      obtenirProduitPublic: jest.fn(),
      listerCategoriesPubliques: jest.fn(),
    } as unknown as jest.Mocked<ShowcaseRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShowcaseService,
        { provide: ShowcaseRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(ShowcaseService);
  });

  describe("obtenirBoutique", () => {
    it("retourne la boutique mappee si elle existe", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue({
        id: "t1", slug: "andy", name: "Andy Resto", activitySector: "RESTAURATION",
        currency: "XOF", email: "a@b.ci", phone: "+225...", address: "Plateau",
        logoUrl: "https://storage/logo.png",
      } as any);

      const r = await service.obtenirBoutique("andy");

      expect(r).toEqual(expect.objectContaining({
        id: "t1", slug: "andy", nom: "Andy Resto", secteur: "RESTAURATION",
        devise: "XOF", email: "a@b.ci", logoUrl: "https://storage/logo.png",
      }));
    });

    it("rejette si slug inconnu", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue(undefined as any);

      await expect(service.obtenirBoutique("inconnu"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("listerProduits", () => {
    it("retourne une page paginee avec data + total", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue({ id: "t1" } as any);
      repoMock.listerProduitsPublics.mockResolvedValue([
        { id: "p1", name: "Burger", description: null, brand: null, categoryId: null,
          images: [], isPromotion: false, promotionPrice: null, outOfStock: false,
          variantes: [{ id: "v1", sku: "B-1", name: null, priceRetail: "3500" }] },
      ] as any);
      repoMock.compterProduitsPublics.mockResolvedValue(42);

      const r = await service.listerProduits("andy", { limit: 24, offset: 0 });

      expect(r.total).toBe(42);
      expect(r.limit).toBe(24);
      expect(r.offset).toBe(0);
      expect(r.data).toHaveLength(1);
      expect(r.data[0]!.nom).toBe("Burger");
      expect(r.data[0]!.variantes[0]!.prixDetail).toBe(3500);
    });

    it("propage les options de filtre au repo (recherche, categorie, pagination)", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue({ id: "t1" } as any);
      repoMock.listerProduitsPublics.mockResolvedValue([]);
      repoMock.compterProduitsPublics.mockResolvedValue(0);

      await service.listerProduits("andy", {
        categorieId: "cat-pizza", recherche: "burger", limit: 10, offset: 20,
      });

      expect(repoMock.listerProduitsPublics).toHaveBeenCalledWith("t1", {
        categorieId: "cat-pizza", recherche: "burger", limit: 10, offset: 20,
      });
      expect(repoMock.compterProduitsPublics).toHaveBeenCalledWith("t1", {
        categorieId: "cat-pizza", recherche: "burger", limit: 10, offset: 20,
      });
    });

    it("rejette si boutique inconnue", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue(undefined as any);

      await expect(service.listerProduits("inconnu"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("obtenirProduit", () => {
    it("retourne le produit mappe", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue({ id: "t1" } as any);
      repoMock.obtenirProduitPublic.mockResolvedValue({
        id: "p1", name: "Burger", description: "Avec frites", brand: "Andy",
        categoryId: "c1", images: ["img1.jpg"],
        isPromotion: true, promotionPrice: "2500", outOfStock: false,
        variantes: [{ id: "v1", sku: "B-1", name: "Maxi", priceRetail: "3500" }],
      } as any);

      const r = await service.obtenirProduit("andy", "p1");

      expect(r.nom).toBe("Burger");
      expect(r.enPromotion).toBe(true);
      expect(r.prixPromotion).toBe(2500);
      expect(r.images).toEqual(["img1.jpg"]);
      expect(r.variantes[0]!.nom).toBe("Maxi");
    });

    it("rejette si produit inconnu (mais boutique ok)", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue({ id: "t1" } as any);
      repoMock.obtenirProduitPublic.mockResolvedValue(null);

      await expect(service.obtenirProduit("andy", "p-inconnu"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("listerCategories", () => {
    it("mappe les categories avec slug par defaut vide", async () => {
      repoMock.trouverBoutiqueParSlug.mockResolvedValue({ id: "t1" } as any);
      repoMock.listerCategoriesPubliques.mockResolvedValue([
        { id: "c1", name: "Plats", slug: "plats" },
        { id: "c2", name: "Boissons", slug: null },
      ] as any);

      const r = await service.listerCategories("andy");

      expect(r).toEqual([
        { id: "c1", nom: "Plats", slug: "plats" },
        { id: "c2", nom: "Boissons", slug: "" },
      ]);
    });
  });
});
