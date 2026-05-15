import { Test } from "@nestjs/testing";
import { LandedCostService, type LigneReception } from "./landed-cost.service";
import { AchatRepository } from "../repositories/achat.repository";

/**
 * Phase A.2 : tests du LandedCostService.
 * Couvre :
 * - Allocation QUANTITY (le plus simple, CdC defaut)
 * - Allocation WEIGHT (proportionnel au poids)
 * - Allocation VALUE (proportionnel a la valeur)
 * - Fallback WEIGHT -> QUANTITY si aucun poids
 * - Edge cases : frais=0, ligne unique, arrondis
 * - Calcul CUMP : premier achat, multi-reception, stock negatif
 */
describe("LandedCostService", () => {
  let service: LandedCostService;
  let repoMock: jest.Mocked<AchatRepository>;

  beforeEach(async () => {
    repoMock = {
      majLandedLigne: jest.fn(),
      obtenirContexteCump: jest.fn(),
      majCump: jest.fn(),
    } as unknown as jest.Mocked<AchatRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        LandedCostService,
        { provide: AchatRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(LandedCostService);
  });

  // ────────────────────────────────────────────────────────────────────
  // Allocation QUANTITY (defaut CdC)
  // ────────────────────────────────────────────────────────────────────
  describe("calculerLandedCosts - QUANTITY", () => {
    it("ventile proportionnel a la quantite recue", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 10, unitPrice: 100 },
        { lineId: "l2", variantId: "v2", quantiteRecue: 30, unitPrice: 50 },
      ];
      // Frais total 1000 F, qty totale = 40 -> 25/unite
      // Ligne 1 : 10/40 = 25%, frais = 250 F, par unite = 25 F
      //   landedUnitCost = 100 + 25 = 125
      // Ligne 2 : 30/40 = 75%, frais = 750 F, par unite = 25 F
      //   landedUnitCost = 50 + 25 = 75
      const r = service.calculerLandedCosts(lignes, 1000, "QUANTITY");

      expect(r).toHaveLength(2);
      expect(r[0].partAllouee).toBeCloseTo(0.25, 4);
      expect(r[0].fraisAlloue).toBe(250);
      expect(r[0].landedUnitCost).toBe(125);
      expect(r[0].landedTotalCost).toBe(1250);

      expect(r[1].partAllouee).toBeCloseTo(0.75, 4);
      expect(r[1].fraisAlloue).toBe(750);
      expect(r[1].landedUnitCost).toBe(75);
      expect(r[1].landedTotalCost).toBe(2250);
    });

    it("frais=0 -> landedUnitCost = unitPrice (pas de surcout)", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 5, unitPrice: 200 },
      ];
      const r = service.calculerLandedCosts(lignes, 0, "QUANTITY");
      expect(r[0].fraisAlloue).toBe(0);
      expect(r[0].landedUnitCost).toBe(200);
      expect(r[0].landedTotalCost).toBe(1000);
    });

    it("ligne unique -> recoit 100% des frais", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 4, unitPrice: 1000 },
      ];
      const r = service.calculerLandedCosts(lignes, 400, "QUANTITY");
      expect(r[0].partAllouee).toBeCloseTo(1.0, 4);
      expect(r[0].fraisAlloue).toBe(400);
      expect(r[0].landedUnitCost).toBe(1100);
    });

    it("ignore les lignes a qty 0 (somme denominateurs)", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 0, unitPrice: 100 },
        { lineId: "l2", variantId: "v2", quantiteRecue: 10, unitPrice: 50 },
      ];
      const r = service.calculerLandedCosts(lignes, 100, "QUANTITY");
      // Ligne 1 a 0 qty : part = 0
      expect(r[0].partAllouee).toBe(0);
      expect(r[0].fraisAlloue).toBe(0);
      // Ligne 2 recoit tout
      expect(r[1].partAllouee).toBeCloseTo(1.0, 4);
      expect(r[1].fraisAlloue).toBe(100);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Allocation WEIGHT
  // ────────────────────────────────────────────────────────────────────
  describe("calculerLandedCosts - WEIGHT", () => {
    it("ventile proportionnel au poids (qty * poids_unitaire)", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 10, unitPrice: 100, poidsUnitaire: 2 },
        { lineId: "l2", variantId: "v2", quantiteRecue: 5, unitPrice: 200, poidsUnitaire: 4 },
      ];
      // Poids total = 20 + 20 = 40, part 50/50
      const r = service.calculerLandedCosts(lignes, 800, "WEIGHT");
      expect(r[0].partAllouee).toBeCloseTo(0.5, 4);
      expect(r[1].partAllouee).toBeCloseTo(0.5, 4);
      // L1 : 400 F / 10 = 40 F par unite. landed = 100 + 40 = 140
      expect(r[0].landedUnitCost).toBe(140);
      // L2 : 400 F / 5 = 80 F par unite. landed = 200 + 80 = 280
      expect(r[1].landedUnitCost).toBe(280);
    });

    it("fallback QUANTITY si tous les poids = 0", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 10, unitPrice: 100, poidsUnitaire: 0 },
        { lineId: "l2", variantId: "v2", quantiteRecue: 30, unitPrice: 50, poidsUnitaire: 0 },
      ];
      const r = service.calculerLandedCosts(lignes, 1000, "WEIGHT");
      // Bascule sur QUANTITY -> 25% / 75%
      expect(r[0].partAllouee).toBeCloseTo(0.25, 4);
      expect(r[1].partAllouee).toBeCloseTo(0.75, 4);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Allocation VALUE
  // ────────────────────────────────────────────────────────────────────
  describe("calculerLandedCosts - VALUE", () => {
    it("ventile proportionnel a la valeur ligne (qty * unit_price)", () => {
      const lignes: LigneReception[] = [
        { lineId: "l1", variantId: "v1", quantiteRecue: 10, unitPrice: 100 },
        { lineId: "l2", variantId: "v2", quantiteRecue: 10, unitPrice: 400 },
      ];
      // Valeurs : 1000 + 4000 = 5000. Parts : 20% / 80%
      const r = service.calculerLandedCosts(lignes, 500, "VALUE");
      expect(r[0].partAllouee).toBeCloseTo(0.2, 4);
      expect(r[1].partAllouee).toBeCloseTo(0.8, 4);
      // L1 : 100 F / 10 = 10 F par unite. landed = 100 + 10 = 110
      expect(r[0].landedUnitCost).toBe(110);
      // L2 : 400 F / 10 = 40 F par unite. landed = 400 + 40 = 440
      expect(r[1].landedUnitCost).toBe(440);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Calcul CUMP
  // ────────────────────────────────────────────────────────────────────
  describe("calculerNouveauCump", () => {
    it("premier achat (stock=0, cump=0) -> cump = landed_unit_cost", () => {
      const cump = service.calculerNouveauCump(0, 0, 10, 125);
      expect(cump).toBe(125);
    });

    it("cumpActuel=0 (jamais initialise) avec stock existant -> ignore le stock, cump = landed", () => {
      // Cas reel : 10 nuggets en stock avec cumpActuel=0 (jamais valorises),
      // on recoit 2 unites a 6000 F debarque. La formule classique donnerait
      // (10*0 + 2*6000) / 12 = 1000, mais c'est aberrant (le stock existant
      // n'a pas de valeur connue, il ne peut pas diluer le cout reel).
      // Bonne reponse : nouveau CUMP = 6000 (cout debarque de la reception).
      const cump = service.calculerNouveauCump(10, 0, 2, 6000);
      expect(cump).toBe(6000);
    });

    it("stock existant + nouveau lot a prix different = moyenne ponderee", () => {
      // 10 unites a 100 + 10 unites a 200 = 20 unites, moyenne 150
      const cump = service.calculerNouveauCump(10, 100, 10, 200);
      expect(cump).toBe(150);
    });

    it("petite reception sur gros stock = peu d'impact", () => {
      // 100 unites a 50 + 1 unite a 100
      // = (100*50 + 1*100) / 101 = 5100/101 = 50.495
      const cump = service.calculerNouveauCump(100, 50, 1, 100);
      expect(cump).toBeCloseTo(50.495, 2);
    });

    it("stock negatif (post-vente offline) traite comme 0", () => {
      // stock = -5, cump existant 100, reception 10 a 200
      // doit utiliser stock = 0 -> cump = 200
      const cump = service.calculerNouveauCump(-5, 100, 10, 200);
      expect(cump).toBe(200);
    });

    it("reception=0 et stock=0 -> garde cump actuel (no-op)", () => {
      const cump = service.calculerNouveauCump(0, 75, 0, 100);
      expect(cump).toBe(75);
    });

    it("multi-reception (CUMP recalcule cumulatif)", () => {
      // Etape 1 : premier achat 10 a 100 -> CUMP = 100
      const cump1 = service.calculerNouveauCump(0, 0, 10, 100);
      expect(cump1).toBe(100);
      // Etape 2 : on a maintenant 10 en stock a CUMP 100,
      // on recoit 20 a 130 -> CUMP = (10*100 + 20*130)/30 = 3600/30 = 120
      const cump2 = service.calculerNouveauCump(10, cump1, 20, 130);
      expect(cump2).toBe(120);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Application bout-en-bout (mock repo)
  // ────────────────────────────────────────────────────────────────────
  describe("appliquerLandedEtRecalculerCump", () => {
    it("persiste landed sur lignes et CUMP sur variants", async () => {
      const resultats = [
        {
          lineId: "l1",
          variantId: "v1",
          quantiteRecue: 10,
          partAllouee: 0.5,
          fraisAlloue: 250,
          landedUnitCost: 125,
          landedTotalCost: 1250,
        },
      ];
      // Apres reception : stock total = 10 (donc avant reception = 0)
      (repoMock.obtenirContexteCump as jest.Mock).mockResolvedValue({
        stockExistant: 10,
        cumpActuel: 0,
      });

      await service.appliquerLandedEtRecalculerCump("t1", resultats);

      expect(repoMock.majLandedLigne).toHaveBeenCalledWith("l1", "125.0000", "1250.00");
      // stockAvant = 10 - 10 = 0, cumpActuel = 0
      // nouveau CUMP = (0*0 + 10*125) / 10 = 125
      expect(repoMock.majCump).toHaveBeenCalledWith("v1", "125.00");
    });
  });
});
