/**
 * Encodage UTF-8 -> CP858 pour imprimantes thermiques ESC/POS.
 *
 * CP858 = page de code multilingue latin + symbole euro. Standard sur
 * Epson TM-T20/T88, Star TSP, Citizen CT-S, et la majorite des Xprinter.
 *
 * Pourquoi pas UTF-8 direct : les imprimantes thermiques ne supportent
 * generalement pas UTF-8. Elles attendent un octet par caractere depuis
 * une table de code. CP858 couvre tout le francais courant + l'euro.
 *
 * Module pur : aucune dependance, testable depuis Bun/Jest sans setup
 * (pas de "use client" ni d'acces window).
 */

/**
 * Table de remapping UTF-8 -> CP858. Couvre le francais courant
 * (minuscules accentuees, majuscules accentuees usuelles, ligatures,
 * symbole euro, degre, guillemets francais, espaces insecables).
 *
 * Caracteres non mappes : remplaces par '?' (0x3f) dans `encoderCP858`.
 * Si une marque exotique a une table differente, ajouter une cle ici
 * plutot que de toucher l'encoder.
 *
 * Les espaces insecables (NBSP U+00A0, NARROW NBSP U+202F) sont mappes
 * sur un espace simple — on perd la propriete "insecable" mais l'octet
 * 0xFF (NBSP en CP858) n'est pas universellement supporte.
 */
export const TABLE_CP858: Record<string, number> = {
  "é": 0x82, "è": 0x8a, "ê": 0x88, "ë": 0x89,
  "à": 0x85, "â": 0x83, "ä": 0x84,
  "ç": 0x87, "î": 0x8c, "ï": 0x8b,
  "ô": 0x93, "ö": 0x94,
  "ù": 0x97, "û": 0x96, "ü": 0x81,
  "ÿ": 0x98,
  "É": 0x90, "À": 0xb7, "Ç": 0x80, "Ê": 0xd2, "È": 0xd4,
  "°": 0xf8, "€": 0xd5, "·": 0xfa,
  "—": 0x2d, "–": 0x2d, "«": 0xae, "»": 0xaf,
  "œ": 0x6f, "Œ": 0x4f,
  "\u00a0": 0x20, // nbsp -> espace simple
  "\u202f": 0x20, // narrow nbsp -> espace simple
};

/** Octet de substitution pour les caracteres non mappes ('?'). */
export const OCTET_INCONNU = 0x3f;

/**
 * Encode une chaine UTF-8 en CP858. Les caracteres ASCII (<0x80) passent
 * tels quels. Les caracteres dans `TABLE_CP858` sont remappes. Tout le
 * reste devient '?'. Iteration par codepoint (`for...of`) pour gerer
 * correctement les surrogate pairs (ex. emojis -> '?').
 */
export function encoderCP858(s: string): Uint8Array {
  const buf: number[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      buf.push(code);
    } else if (TABLE_CP858[ch] !== undefined) {
      buf.push(TABLE_CP858[ch]);
    } else {
      buf.push(OCTET_INCONNU);
    }
  }
  return new Uint8Array(buf);
}
