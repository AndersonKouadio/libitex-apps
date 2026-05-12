import { describe, expect, it } from "bun:test";
import { ConstructeurEscPos, ESC, GS, LF } from "../builder";

describe("ConstructeurEscPos", () => {
  it("init() emet ESC @ (reset imprimante)", () => {
    const out = new ConstructeurEscPos().init().build();
    expect(Array.from(out)).toEqual([ESC, 0x40]);
  });

  it("codePageCp858() selectionne la table 19", () => {
    const out = new ConstructeurEscPos().codePageCp858().build();
    expect(Array.from(out)).toEqual([ESC, 0x74, 19]);
  });

  it("aligner() emet ESC a 0/1/2 selon le mode", () => {
    expect(Array.from(new ConstructeurEscPos().aligner("gauche").build())).toEqual([ESC, 0x61, 0]);
    expect(Array.from(new ConstructeurEscPos().aligner("centre").build())).toEqual([ESC, 0x61, 1]);
    expect(Array.from(new ConstructeurEscPos().aligner("droite").build())).toEqual([ESC, 0x61, 2]);
  });

  it("gras(true|false) emet ESC E 1|0", () => {
    expect(Array.from(new ConstructeurEscPos().gras(true).build())).toEqual([ESC, 0x45, 1]);
    expect(Array.from(new ConstructeurEscPos().gras(false).build())).toEqual([ESC, 0x45, 0]);
  });

  it("taille(0x10) double largeur, taille(0x20) double hauteur", () => {
    expect(Array.from(new ConstructeurEscPos().taille(0x10).build())).toEqual([ESC, 0x21, 0x10]);
    expect(Array.from(new ConstructeurEscPos().taille(0x20).build())).toEqual([ESC, 0x21, 0x20]);
  });

  it("texte() encode en CP858 sans ajouter de LF", () => {
    const out = new ConstructeurEscPos().texte("Cafe").build();
    expect(Array.from(out)).toEqual([0x43, 0x61, 0x66, 0x65]);
  });

  it("ligne() ajoute un LF apres le texte", () => {
    const out = new ConstructeurEscPos().ligne("AB").build();
    expect(Array.from(out)).toEqual([0x41, 0x42, LF]);
  });

  it("ligne() sans argument emet juste un LF", () => {
    const out = new ConstructeurEscPos().ligne().build();
    expect(Array.from(out)).toEqual([LF]);
  });

  it("saut(3) emet 3 LF", () => {
    const out = new ConstructeurEscPos().saut(3).build();
    expect(Array.from(out)).toEqual([LF, LF, LF]);
  });

  it("couper() emet GS V 0x42 0x00 (coupe partielle)", () => {
    const out = new ConstructeurEscPos().couper().build();
    expect(Array.from(out)).toEqual([GS, 0x56, 0x42, 0x00]);
  });

  it("chainage fluent : produit la sequence complete dans l'ordre", () => {
    const out = new ConstructeurEscPos()
      .init()
      .codePageCp858()
      .aligner("centre")
      .gras(true)
      .ligne("OK")
      .gras(false)
      .couper()
      .build();
    expect(Array.from(out)).toEqual([
      ESC, 0x40,             // init
      ESC, 0x74, 19,         // CP858
      ESC, 0x61, 1,          // centre
      ESC, 0x45, 1,          // gras on
      0x4f, 0x4b, LF,        // "OK\n"
      ESC, 0x45, 0,          // gras off
      GS, 0x56, 0x42, 0x00,  // coupe
    ]);
  });

  it("encode les accents francais via texte()", () => {
    const out = new ConstructeurEscPos().texte("Cafe au lait : 1 500 F").build();
    // 'C' 'a' 'f' 'e' ' ' 'a' 'u' ' ' 'l' 'a' 'i' 't' ' ' ':' ' ' '1' ' ' '5' '0' '0' ' ' 'F'
    expect(Array.from(out)).toEqual([
      0x43, 0x61, 0x66, 0x65, 0x20, 0x61, 0x75, 0x20,
      0x6c, 0x61, 0x69, 0x74, 0x20, 0x3a, 0x20, 0x31,
      0x20, 0x35, 0x30, 0x30, 0x20, 0x46,
    ]);
  });

  it("build() retourne un Uint8Array (pas un number[])", () => {
    const out = new ConstructeurEscPos().texte("x").build();
    expect(out).toBeInstanceOf(Uint8Array);
  });

  it("chaque instance maintient son propre buffer", () => {
    const a = new ConstructeurEscPos().texte("A");
    const b = new ConstructeurEscPos().texte("B");
    expect(Array.from(a.build())).toEqual([0x41]);
    expect(Array.from(b.build())).toEqual([0x42]);
  });
});
