/**
 * Generation de code-barres Code 128 en SVG, sans dependance externe.
 *
 * Code 128 set B : supporte tous les caracteres ASCII 32-127 (espaces,
 * chiffres, lettres, ponctuation). Suffisant pour les SKU internes de
 * type "STD-NUGGETS-Q91M" ou "COCA-33". Pour scanner des EAN13 standard
 * (produits du commerce), preferer EAN13 — non implementé ici.
 *
 * Algorithme :
 *  1. Convertit chaque caractere en valeur (ASCII - 32) → table set B
 *  2. Calcule le checksum : (startB + sum(position * valeur)) mod 103
 *  3. Concatene [startB, ...data, checksum, stop]
 *  4. Genere les patterns de barres correspondants
 *
 * Source de verite : https://en.wikipedia.org/wiki/Code_128
 */

// 107 patterns Code128 : chaque pattern = 6 largeurs (B-W-B-W-B-W) en modules.
// Le code 106 (stop) inclut un suffixe "11" en plus pour les 2 modules finaux.
const PATTERN_C128 = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242",
  "121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121",
  "111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131",
  "211412","211214","211232","2331112",
];

const START_B = 104;
const STOP = 106;

export interface Code128Options {
  /** Hauteur des barres en pixels (defaut: 50). */
  hauteur?: number;
  /** Largeur d'un module en pixels (defaut: 2 — confortable pour scan smartphone). */
  largeurModule?: number;
  /** Affiche le texte sous le code-barres (defaut: true). */
  afficherTexte?: boolean;
  /** Taille de police du texte (defaut: 14). */
  taillePolice?: number;
  /** Couleur des barres (defaut: black). */
  couleur?: string;
  /** Couleur du fond (defaut: white). */
  fond?: string;
  /** Marges horizontales en modules (defaut: 10 — zone de quiet zone). */
  marge?: number;
}

/**
 * Genere un SVG Code 128 set B pour la chaine donnee.
 * Retourne un string SVG complet (<svg>...</svg>) pret a etre injecte
 * via dangerouslySetInnerHTML ou affiche.
 *
 * @throws Error si le texte contient un caractere non supporte (hors ASCII 32-127).
 */
export function genererCode128Svg(texte: string, options: Code128Options = {}): string {
  const {
    hauteur = 50,
    largeurModule = 2,
    afficherTexte = true,
    taillePolice = 14,
    couleur = "black",
    fond = "white",
    marge = 10,
  } = options;

  if (texte.length === 0) {
    throw new Error("Texte vide");
  }

  const valeurs: number[] = [];
  for (const c of texte) {
    const code = c.charCodeAt(0);
    if (code < 32 || code > 127) {
      throw new Error(`Caractère non supporté: ${c} (code ${code})`);
    }
    valeurs.push(code - 32);
  }

  // Checksum Code128: (startB + sum(position * valeur)) mod 103
  //                    avec position commencant a 1 pour la 1ere data.
  let checksum = START_B;
  for (let i = 0; i < valeurs.length; i++) {
    checksum += (i + 1) * valeurs[i]!;
  }
  checksum = checksum % 103;

  const codes = [START_B, ...valeurs, checksum, STOP];

  // Genere les rectangles SVG (alternance barre/espace en largeurs Module).
  // Le pattern commence toujours par une barre (noir).
  const rects: string[] = [];
  let x = marge * largeurModule;
  for (const code of codes) {
    const pattern = PATTERN_C128[code]!;
    let estBarre = true;
    for (const largeurStr of pattern) {
      const largeur = Number(largeurStr) * largeurModule;
      if (estBarre) {
        rects.push(`<rect x="${x}" y="0" width="${largeur}" height="${hauteur}" fill="${couleur}"/>`);
      }
      x += largeur;
      estBarre = !estBarre;
    }
  }

  const largeurTotale = x + marge * largeurModule;
  const hauteurTotale = afficherTexte ? hauteur + taillePolice + 6 : hauteur;
  const texteEchape = texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const texteSvg = afficherTexte
    ? `<text x="${largeurTotale / 2}" y="${hauteur + taillePolice + 2}" font-family="ui-monospace, monospace" font-size="${taillePolice}" text-anchor="middle" fill="${couleur}">${texteEchape}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largeurTotale}" height="${hauteurTotale}" viewBox="0 0 ${largeurTotale} ${hauteurTotale}">` +
    `<rect width="100%" height="100%" fill="${fond}"/>` +
    rects.join("") +
    texteSvg +
    `</svg>`;
}
