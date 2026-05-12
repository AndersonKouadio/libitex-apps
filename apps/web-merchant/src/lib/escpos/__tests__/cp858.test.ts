import { describe, expect, it } from "bun:test";
import { encoderCP858, OCTET_INCONNU, TABLE_CP858 } from "../cp858";

describe("encoderCP858", () => {
  it("encode ASCII pur sans modification", () => {
    const bytes = encoderCP858("Hello 123");
    expect(Array.from(bytes)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x31, 0x32, 0x33]);
  });

  it("encode les accents francais courants", () => {
    const bytes = encoderCP858("éèêëàâäçîïôöùûüÿ");
    expect(Array.from(bytes)).toEqual([
      0x82, 0x8a, 0x88, 0x89,       // é è ê ë
      0x85, 0x83, 0x84, 0x87,       // à â ä ç
      0x8c, 0x8b, 0x93, 0x94,       // î ï ô ö
      0x97, 0x96, 0x81, 0x98,       // ù û ü ÿ
    ]);
  });

  it("encode les majuscules accentuees", () => {
    const bytes = encoderCP858("ÉÀÇÊÈ");
    expect(Array.from(bytes)).toEqual([0x90, 0xb7, 0x80, 0xd2, 0xd4]);
  });

  it("encode le symbole euro et le degre", () => {
    const bytes = encoderCP858("12.50€ 25°C");
    expect(Array.from(bytes)).toEqual([
      0x31, 0x32, 0x2e, 0x35, 0x30, 0xd5,   // 12.50€
      0x20,                                  // espace
      0x32, 0x35, 0xf8, 0x43,                // 25°C
    ]);
  });

  it("remplace les caracteres non mappes par '?'", () => {
    const bytes = encoderCP858("日本語");
    expect(Array.from(bytes)).toEqual([OCTET_INCONNU, OCTET_INCONNU, OCTET_INCONNU]);
  });

  it("remplace les emojis (surrogate pairs) par '?'", () => {
    // "🛒" = 1 codepoint (U+1F6D2) mais 2 UTF-16 surrogates en JS.
    // for...of itere par codepoint donc on ne pousse qu'un seul '?'.
    const bytes = encoderCP858("🛒");
    expect(Array.from(bytes)).toEqual([OCTET_INCONNU]);
  });

  it("retourne un Uint8Array vide pour une chaine vide", () => {
    const bytes = encoderCP858("");
    expect(bytes.length).toBe(0);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });

  it("encode les tirets cadratin et demi-cadratin sur 0x2d (hyphen)", () => {
    const bytes = encoderCP858("a—b–c");
    expect(Array.from(bytes)).toEqual([0x61, 0x2d, 0x62, 0x2d, 0x63]);
  });

  it("encode les guillemets francais", () => {
    const bytes = encoderCP858("«hello»");
    expect(Array.from(bytes)).toEqual([0xae, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0xaf]);
  });

  it("encode les ligatures œ et Œ sur o/O simple (perte d'information voulue)", () => {
    const bytes = encoderCP858("œŒ");
    expect(Array.from(bytes)).toEqual([0x6f, 0x4f]);
  });

  it("encode l'apostrophe et les caracteres ASCII speciaux", () => {
    const bytes = encoderCP858("L'Atelier #1 @home");
    expect(Array.from(bytes)).toEqual([
      0x4c, 0x27, 0x41, 0x74, 0x65, 0x6c, 0x69, 0x65, 0x72,  // L'Atelier
      0x20, 0x23, 0x31, 0x20, 0x40, 0x68, 0x6f, 0x6d, 0x65,  // " #1 @home"
    ]);
  });

  it("TABLE_CP858 expose tous les accents minuscules francais", () => {
    for (const ch of "éèêëàâäçîïôöùûüÿ") {
      expect(TABLE_CP858[ch]).toBeDefined();
    }
  });

  it("retourne un vrai Uint8Array (pas un number[])", () => {
    const bytes = encoderCP858("test");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(4);
  });
});
