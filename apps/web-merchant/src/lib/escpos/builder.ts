/**
 * Builder fluent pour construire un buffer ESC/POS.
 *
 * Cible Epson TM/T-series (compat Star, Citizen, Xprinter, GooJPRT...).
 * Toutes les commandes utilisent la table CP858 cote encodage texte.
 *
 * Module pur : aucune dependance navigateur, testable depuis Bun/Jest.
 */

import { encoderCP858 } from "./cp858";

/** Octets de controle ESC/POS. */
export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

export class ConstructeurEscPos {
  private buf: number[] = [];

  /** ESC @ : initialisation (reset taille, alignement, gras...). */
  init(): this { this.buf.push(ESC, 0x40); return this; }

  /**
   * ESC t n : selectionne la table de codes.
   * n=19 = CP858 sur Epson TM. Sur certaines clones n=13 (cp437) mieux mais
   * 19 est compatible Epson natif + clones recents.
   */
  codePageCp858(): this { this.buf.push(ESC, 0x74, 19); return this; }

  /** ESC a n : alignement (0=gauche, 1=centre, 2=droite). */
  aligner(mode: "gauche" | "centre" | "droite"): this {
    const n = mode === "gauche" ? 0 : mode === "centre" ? 1 : 2;
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  /** ESC E n : gras on/off. */
  gras(actif: boolean): this { this.buf.push(ESC, 0x45, actif ? 1 : 0); return this; }

  /** ESC ! n : taille caracteres. Bits : 0x10 = double largeur, 0x20 = double hauteur. */
  taille(n: number): this { this.buf.push(ESC, 0x21, n); return this; }

  /** Ecrit du texte en CP858 (sans retour-ligne). */
  texte(s: string): this {
    const bytes = encoderCP858(s);
    for (const b of bytes) this.buf.push(b);
    return this;
  }

  /** Ecrit du texte + retour-ligne (LF). */
  ligne(s = ""): this { this.texte(s); this.buf.push(LF); return this; }

  /** N retours-ligne supplementaires. */
  saut(n = 1): this { for (let i = 0; i < n; i += 1) this.buf.push(LF); return this; }

  /** GS V m : coupe le papier. m=66 (0x42) = feed puis coupe partielle. */
  couper(): this { this.buf.push(GS, 0x56, 0x42, 0x00); return this; }

  /** Renvoie le buffer final. */
  build(): Uint8Array { return new Uint8Array(this.buf); }
}
