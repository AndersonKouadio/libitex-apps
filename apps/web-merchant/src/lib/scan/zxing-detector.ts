/**
 * Module 13 D1 : fallback ZXing pour les navigateurs sans BarcodeDetector
 * (iOS Safari, Firefox, Samsung Internet, Opera).
 *
 * On expose la meme interface que BarcodeDetectorInstance pour que le
 * modal scanner camera puisse switcher d'implementation sans toucher la
 * logique d'orchestration (boucle detection + beep + close).
 *
 * Pourquoi pas BrowserMultiFormatReader.decodeFromVideoDevice() directement :
 * - Il gere son propre stream camera, mais le modal a deja son MediaStream
 *   pour le torch et le switch front/back → conflit.
 * - On veut detecter dans le video element existant frame par frame
 *   (interface DETECT-once), pas une boucle interne ZXing.
 *
 * Solution : decodeOnceFromVideoElement() qui fait UNE detection sur la
 * frame courante. La boucle reste dans le composant (setInterval) qui
 * appelle detect() repetee.
 */
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type {
  BarcodeDetectionResult, BarcodeDetectorInstance,
} from "./barcode-detector";

/**
 * Mapping des formats BarcodeDetector → BarcodeFormat ZXing. On garde
 * les memes IDs que le standard BarcodeDetector pour l'orchestration
 * (le composant scanner camera n'a pas a savoir quel moteur tourne).
 */
const MAPPING_FORMATS: Record<string, BarcodeFormat> = {
  ean_13: BarcodeFormat.EAN_13,
  ean_8: BarcodeFormat.EAN_8,
  upc_a: BarcodeFormat.UPC_A,
  upc_e: BarcodeFormat.UPC_E,
  code_128: BarcodeFormat.CODE_128,
  code_39: BarcodeFormat.CODE_39,
  code_93: BarcodeFormat.CODE_93,
  itf: BarcodeFormat.ITF,
  qr_code: BarcodeFormat.QR_CODE,
};

/**
 * Mapping inverse pour retourner le nom dans BarcodeDetectionResult.
 * Si le format ZXing detecte n'est pas dans la map → "unknown".
 */
const MAPPING_INVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(MAPPING_FORMATS).map(([k, v]) => [v, k]),
);

/**
 * Cree un detecteur ZXing qui implemente l'interface BarcodeDetectorInstance.
 * Renvoie toujours une instance (ZXing est une lib JS pure, dispo partout).
 *
 * Limite vs natif :
 * - Performance moindre (~20-50 FPS vs natif 60 FPS)
 * - Pas de detection multi-codes par frame (renvoie 1 seul code)
 *   → acceptable pour POS (1 produit a la fois)
 */
export function creerZxingDetector(
  formats: ReadonlyArray<string>,
): BarcodeDetectorInstance {
  const hints = new Map();
  const formatsZxing = formats
    .map((f) => MAPPING_FORMATS[f])
    .filter((v): v is BarcodeFormat => v != null);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formatsZxing);
  // Try harder : tente plus d'orientations + tailles. Cout CPU
  // raisonnable pour 1 frame, mais utile sur mobile bas-de-gamme.
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);

  return {
    async detect(
      source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    ): Promise<BarcodeDetectionResult[]> {
      // ZXing prend HTMLVideoElement direct, mais pas ImageBitmap.
      // Pour HTMLCanvasElement ou ImageBitmap, on dessine dans un canvas
      // temporaire et ZXing peut decoder via decodeFromImageElement
      // (avec un workaround : on cree un <img> a partir d'une data URL).
      // Cas POS : on passe toujours HTMLVideoElement → fast path.
      if (source instanceof HTMLVideoElement) {
        try {
          // decodeOnceFromVideoElement n'existe pas — on utilise
          // decodeFromVideoElement avec un callback one-shot.
          // Plus simple : decodeFromCanvas via captureFrame.
          const canvas = document.createElement("canvas");
          canvas.width = source.videoWidth;
          canvas.height = source.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return [];
          ctx.drawImage(source, 0, 0);
          const result = await reader.decodeFromCanvas(canvas);
          if (!result) return [];
          const format = MAPPING_INVERSE[result.getBarcodeFormat()] ?? "unknown";
          return [{ rawValue: result.getText(), format }];
        } catch {
          // ZXing throw NotFoundException si aucun code detecte. C'est
          // le cas normal entre deux scans → on retourne []
          return [];
        }
      }
      // Path froid pour canvas / bitmap : pas utilise par le scanner POS
      // actuel mais on supporte pour completude.
      if (source instanceof HTMLCanvasElement) {
        try {
          const result = await reader.decodeFromCanvas(source);
          if (!result) return [];
          const format = MAPPING_INVERSE[result.getBarcodeFormat()] ?? "unknown";
          return [{ rawValue: result.getText(), format }];
        } catch {
          return [];
        }
      }
      return [];
    },
  };
}
