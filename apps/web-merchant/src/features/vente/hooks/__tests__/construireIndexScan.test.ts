import { describe, expect, it } from "bun:test";
import { construireIndexScan } from "../useScanProduit";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import { TypeProduit } from "@/features/catalogue/types/produit.type";
import { UniteMesure } from "@/features/unite/types/unite.type";

/**
 * Helper de construction de fixtures. Cree un produit minimal avec une
 * variante simple. Les valeurs non pertinentes pour le test sont par
 * defaut, l'override permet de specifier ce qu'on teste.
 */
function fixtureVariante(over: Partial<IVariante> = {}): IVariante {
  return {
    id: "v-default",
    sku: "SKU-DEFAULT",
    nom: null,
    attributs: {},
    codeBarres: null,
    prixAchat: 0,
    prixDetail: 1000,
    prixGros: null,
    prixVip: null,
    uniteVente: UniteMesure.PIECE,
    pasMin: null,
    prixParUnite: false,
    ...over,
  };
}

function fixtureProduit(id: string, variantes: IVariante[]): IProduit {
  return {
    id,
    nom: `Produit ${id}`,
    description: null,
    typeProduit: TypeProduit.SIMPLE,
    marque: null,
    categorieId: null,
    tauxTva: 0,
    images: [],
    metadataSecteur: {},
    cookingTimeMinutes: null,
    prixPromotion: null,
    enPromotion: false,
    niveauEpice: null,
    tagsCuisine: [],
    enRupture: false,
    modeDisponibilite: "TOUJOURS",
    planningDisponibilite: {},
    emplacementsDisponibles: [],
    actif: true,
    isSupplement: false,
    variantes,
    creeLe: "2026-01-01T00:00:00.000Z",
  };
}

describe("construireIndexScan", () => {
  it("retourne une Map vide pour une liste vide", () => {
    const map = construireIndexScan([]);
    expect(map.size).toBe(0);
  });

  it("indexe une variante par son codeBarres", () => {
    const v = fixtureVariante({ id: "v1", sku: "CAF-001", codeBarres: "3017620422003" });
    const p = fixtureProduit("p1", [v]);
    const map = construireIndexScan([p]);
    expect(map.get("3017620422003")).toEqual({ produit: p, variante: v });
  });

  it("indexe une variante par son SKU", () => {
    const v = fixtureVariante({ id: "v1", sku: "CAF-001", codeBarres: null });
    const p = fixtureProduit("p1", [v]);
    const map = construireIndexScan([p]);
    expect(map.get("CAF-001")).toEqual({ produit: p, variante: v });
  });

  it("indexe le codeBarres ET le sku sur la meme variante (2 cles)", () => {
    const v = fixtureVariante({ id: "v1", sku: "CAF-001", codeBarres: "3017620422003" });
    const p = fixtureProduit("p1", [v]);
    const map = construireIndexScan([p]);
    expect(map.size).toBe(2);
    expect(map.get("3017620422003")).toBeDefined();
    expect(map.get("CAF-001")).toBeDefined();
  });

  it("indexe toutes les variantes d'un produit multi-variantes", () => {
    const v1 = fixtureVariante({ id: "v1", sku: "T-RED", codeBarres: "AAA1" });
    const v2 = fixtureVariante({ id: "v2", sku: "T-BLUE", codeBarres: "AAA2" });
    const p = fixtureProduit("p1", [v1, v2]);
    const map = construireIndexScan([p]);
    expect(map.size).toBe(4);
    expect(map.get("AAA1")?.variante.id).toBe("v1");
    expect(map.get("AAA2")?.variante.id).toBe("v2");
    expect(map.get("T-RED")?.variante.id).toBe("v1");
    expect(map.get("T-BLUE")?.variante.id).toBe("v2");
  });

  it("indexe plusieurs produits sans conflit", () => {
    const p1 = fixtureProduit("p1", [fixtureVariante({ id: "v1", sku: "SKU-1", codeBarres: "111" })]);
    const p2 = fixtureProduit("p2", [fixtureVariante({ id: "v2", sku: "SKU-2", codeBarres: "222" })]);
    const map = construireIndexScan([p1, p2]);
    expect(map.size).toBe(4);
    expect(map.get("111")?.produit.id).toBe("p1");
    expect(map.get("222")?.produit.id).toBe("p2");
  });

  it("ignore les codeBarres null mais indexe le SKU", () => {
    const v = fixtureVariante({ id: "v1", sku: "INT-001", codeBarres: null });
    const p = fixtureProduit("p1", [v]);
    const map = construireIndexScan([p]);
    expect(map.size).toBe(1);
    expect(map.get("INT-001")).toBeDefined();
  });

  it("ignore les SKU vides string", () => {
    const v = fixtureVariante({ id: "v1", sku: "", codeBarres: "ABC" });
    const p = fixtureProduit("p1", [v]);
    const map = construireIndexScan([p]);
    // Seule "ABC" est indexee (SKU vide ne genere pas d'entree car !v.sku === true)
    expect(map.size).toBe(1);
    expect(map.get("ABC")).toBeDefined();
  });

  it("supporte les produits sans variantes (catalogue partiel)", () => {
    const p = fixtureProduit("p1", []);
    const map = construireIndexScan([p]);
    expect(map.size).toBe(0);
  });

  it("derniere ecriture gagne en cas de collision (sku == codeBarres autre variante)", () => {
    // v1 a codeBarres "ABC", v2 a sku "ABC" — le second ecrase le premier.
    const v1 = fixtureVariante({ id: "v1", sku: "X", codeBarres: "ABC" });
    const v2 = fixtureVariante({ id: "v2", sku: "ABC", codeBarres: null });
    const p = fixtureProduit("p1", [v1, v2]);
    const map = construireIndexScan([p]);
    expect(map.get("ABC")?.variante.id).toBe("v2");
  });

  it("performance : indexe 1000 produits x 3 variantes < 50ms", () => {
    const produits: IProduit[] = [];
    for (let i = 0; i < 1000; i += 1) {
      produits.push(fixtureProduit(`p${i}`, [
        fixtureVariante({ id: `v${i}-0`, sku: `SKU-${i}-0`, codeBarres: `EAN-${i}-0` }),
        fixtureVariante({ id: `v${i}-1`, sku: `SKU-${i}-1`, codeBarres: `EAN-${i}-1` }),
        fixtureVariante({ id: `v${i}-2`, sku: `SKU-${i}-2`, codeBarres: `EAN-${i}-2` }),
      ]));
    }
    const t0 = performance.now();
    const map = construireIndexScan(produits);
    const dureeMs = performance.now() - t0;
    expect(map.size).toBe(6000); // 1000*3 variantes * 2 cles (sku + codeBarres)
    expect(dureeMs).toBeLessThan(50);
  });
});
