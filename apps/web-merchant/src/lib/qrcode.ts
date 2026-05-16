/**
 * Wrapper SVG autour de la lib Project Nayuki QR Code Generator (vendorisee
 * dans qrcodegen.ts, MIT License). Genere un string SVG pret a inliner via
 * dangerouslySetInnerHTML — pas de canvas, pas de dependance npm.
 *
 * Usage typique : encoder une URL otpauth pour la mise en place MFA.
 */

import { qrcodegen } from "./qrcodegen";

export interface OptionsQrCode {
  /** Niveau de correction d'erreur. LOW=7%, MEDIUM=15%, QUARTILE=25%, HIGH=30%. */
  niveauCorrection?: "LOW" | "MEDIUM" | "QUARTILE" | "HIGH";
  /** Taille du SVG en pixels (carré). Defaut: 240. */
  taille?: number;
  /** Marge en modules autour du QR (quiet zone). Defaut: 4 (recommandation spec). */
  marge?: number;
  /** Couleur des modules sombres. Defaut: #111. */
  couleurSombre?: string;
  /** Couleur du fond (modules clairs). Defaut: #fff. */
  couleurClaire?: string;
}

/**
 * Genere un SVG (string) contenant le QR Code pour le texte donne.
 * Le SVG est carre, dimensionne via viewBox, donc agnostique de la taille
 * affichee — peut etre stretche/contracte avec du CSS sans perte.
 */
export function genererQrCodeSvg(texte: string, options: OptionsQrCode = {}): string {
  const {
    niveauCorrection = "MEDIUM",
    taille = 240,
    marge = 4,
    couleurSombre = "#111",
    couleurClaire = "#fff",
  } = options;

  const ecl = qrcodegen.QrCode.Ecc[niveauCorrection];
  const qr = qrcodegen.QrCode.encodeText(texte, ecl);
  const size = qr.size;
  const total = size + marge * 2;

  // Concatene tous les modules sombres en un seul path SVG ("M x y h1 v1 z").
  // Plus compact qu'un <rect> par module et tres efficace au rendu.
  const segments: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.getModule(x, y)) {
        segments.push(`M${x + marge},${y + marge}h1v1h-1z`);
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${taille}" height="${taille}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="${couleurClaire}"/>`,
    `<path d="${segments.join("")}" fill="${couleurSombre}"/>`,
    `</svg>`,
  ].join("");
}
