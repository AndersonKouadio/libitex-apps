import { describe, expect, it } from "bun:test";
import { validerEan13 } from "../useScanProduit";

/**
 * Tests sur la validation EAN-13. Le hook `useScanProduit` lui-meme
 * (anti-rebond + recherche cache + fallback API) reste teste en E2E ;
 * on couvre ici la partie pure facile a isoler.
 */

describe("validerEan13", () => {
  it("valide un EAN-13 reel (Nutella 3017620422003)", () => {
    expect(validerEan13("3017620422003")).toBe(true);
  });

  it("valide un EAN-13 reel (Coca-Cola 5449000000996)", () => {
    expect(validerEan13("5449000000996")).toBe(true);
  });

  it("valide un EAN-13 reel (Faber-Castell 4006381333931)", () => {
    expect(validerEan13("4006381333931")).toBe(true);
  });

  it("valide un EAN-13 test 1234567890128", () => {
    expect(validerEan13("1234567890128")).toBe(true);
  });

  it("invalide un EAN-13 avec checksum modifie", () => {
    // 3017620422003 valide -> 3017620422004 invalide
    expect(validerEan13("3017620422004")).toBe(false);
  });

  it("invalide un EAN-13 avec un chiffre swap (douchette mal calibree)", () => {
    // 3017620422003 -> 3017602422003 (echange position 4-5)
    expect(validerEan13("3017602422003")).toBe(false);
  });

  it("retourne null pour un code de longueur differente (pas EAN-13)", () => {
    expect(validerEan13("12345")).toBe(null);
    expect(validerEan13("12345678")).toBe(null);
    expect(validerEan13("12345678901234")).toBe(null);
  });

  it("retourne null pour un code contenant des lettres (SKU interne)", () => {
    expect(validerEan13("CAF-001")).toBe(null);
    expect(validerEan13("ABC1234567890")).toBe(null);
  });

  it("retourne null pour une chaine vide", () => {
    expect(validerEan13("")).toBe(null);
  });

  it("valide un EAN-13 commencant par 0 (UPC etendu)", () => {
    // 0123456789012 : recalcul du checksum
    // (0*1)+(1*3)+(2*1)+(3*3)+(4*1)+(5*3)+(6*1)+(7*3)+(8*1)+(9*3)+(0*1)+(1*3) = 0+3+2+9+4+15+6+21+8+27+0+3 = 98
    // checksum = (10 - (98 % 10)) % 10 = 2
    expect(validerEan13("0123456789012")).toBe(true);
  });

  it("invalide quand checksum mismatch sur EAN-13 commencant par 0", () => {
    expect(validerEan13("0123456789013")).toBe(false);
  });

  it("retourne null pour un code avec des espaces ou tirets", () => {
    expect(validerEan13("3 017 620 422 003")).toBe(null);
    expect(validerEan13("3017-620-422-003")).toBe(null);
  });
});
