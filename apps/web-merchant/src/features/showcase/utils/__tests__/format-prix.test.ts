import { describe, expect, it } from "bun:test";
import { formatPrix } from "../format-prix";

/**
 * Note : Intl.NumberFormat("fr-FR") utilise un NBSP (U+00A0) entre les
 * milliers, pas un espace standard. On normalise dans les expects pour
 * comparer sans s'embeter avec les caracteres invisibles.
 */
const normaliserEspaces = (s: string) => s.replace(/ /g, " ").replace(/ /g, " ");

describe("formatPrix", () => {
  it("formate un prix entier avec espace milliers + devise (XOF)", () => {
    expect(normaliserEspaces(formatPrix(1500, "XOF"))).toBe("1 500 XOF");
  });

  it("formate sans separateur quand < 1000", () => {
    expect(normaliserEspaces(formatPrix(500, "XOF"))).toBe("500 XOF");
  });

  it("formate les gros montants", () => {
    expect(normaliserEspaces(formatPrix(1234567, "XOF"))).toBe("1 234 567 XOF");
  });

  it("supporte une devise F CFA classique", () => {
    expect(normaliserEspaces(formatPrix(2000, "F CFA"))).toBe("2 000 F CFA");
  });

  it("supporte une devise EUR", () => {
    expect(normaliserEspaces(formatPrix(15, "EUR"))).toBe("15 EUR");
  });

  it("supporte 0", () => {
    expect(normaliserEspaces(formatPrix(0, "XOF"))).toBe("0 XOF");
  });

  it("respecte la devise quelle qu'elle soit", () => {
    expect(formatPrix(100, "XYZ")).toContain("XYZ");
  });

  it("arrondi les decimales (formatMontant fait Math.round)", () => {
    // 1234.56 -> arrondi a 1235
    expect(normaliserEspaces(formatPrix(1234.56, "XOF"))).toBe("1 235 XOF");
  });
});
