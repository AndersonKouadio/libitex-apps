/**
 * Wrapper minimal autour de l'API BarcodeDetector (Chrome desktop+Android,
 * Edge ; absent sur Safari/Firefox). Centralise les types et la liste de
 * formats supportes.
 *
 * Module pur (pas de "use client") : importable depuis n'importe ou.
 */

// Declaration minimale (pas dans lib.dom.d.ts standard).
export interface BarcodeDetectionResult {
  rawValue: string;
  format: string;
}
export interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<BarcodeDetectionResult[]>;
}
export interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): BarcodeDetectorInstance;
}
declare global {
  interface Window { BarcodeDetector?: BarcodeDetectorCtor }
}

/**
 * Formats supportes par defaut. Couvre les standards retail africains :
 * - EAN-13/8 + UPC-A/E : codes produits emballes
 * - Code 128/39/93 + ITF : etiquettes internes (cartons, lots)
 * - QR : utile pour reservations, programmes fidelite, etc.
 *
 * Fix m2 : extrait du composant pour permettre une configuration tenant
 * future (ex. magasin food africain n'a pas besoin de Code 128).
 */
export const FORMATS_SCAN_DEFAULT: ReadonlyArray<string> = [
  "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "code_93",
  "itf", "qr_code",
];

/**
 * Cree une instance BarcodeDetector. Renvoie null si l'API n'est pas
 * supportee (Safari, Firefox) — le caller doit alors afficher un message
 * de degradation.
 */
export function creerBarcodeDetector(
  formats: ReadonlyArray<string> = FORMATS_SCAN_DEFAULT,
): BarcodeDetectorInstance | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.BarcodeDetector;
  if (!Ctor) return null;
  return new Ctor({ formats: [...formats] });
}

/** Vrai si BarcodeDetector est disponible dans le navigateur courant. */
export function supporteBarcodeDetector(): boolean {
  return typeof window !== "undefined" && !!window.BarcodeDetector;
}
