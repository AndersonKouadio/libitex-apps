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
 * Cree une instance BarcodeDetector natif. Renvoie null si l'API n'est
 * pas supportee. Pour un detecteur universel (ZXing fallback inclus),
 * utiliser creerDetecteur().
 */
export function creerBarcodeDetector(
  formats: ReadonlyArray<string> = FORMATS_SCAN_DEFAULT,
): BarcodeDetectorInstance | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.BarcodeDetector;
  if (!Ctor) return null;
  return new Ctor({ formats: [...formats] });
}

/** Vrai si BarcodeDetector natif est disponible dans le navigateur courant. */
export function supporteBarcodeDetector(): boolean {
  return typeof window !== "undefined" && !!window.BarcodeDetector;
}

/**
 * Module 13 D1 : factory unifiee avec fallback ZXing. Choisit
 * automatiquement :
 * 1. BarcodeDetector natif si dispo (Chrome desktop+Android, Edge) — rapide
 * 2. Fallback ZXing JS pure (iOS Safari, Firefox, Samsung Internet, Opera)
 *
 * Renvoie toujours un detecteur (sauf en SSR). Le caller n'a plus besoin
 * de tester supporteBarcodeDetector() — le scan camera est disponible
 * universellement sur tous les navigateurs modernes.
 *
 * ZXing est lazy-loaded pour ne pas alourdir le bundle initial sur les
 * ~80% de navigateurs qui ont le natif.
 */
export async function creerDetecteur(
  formats: ReadonlyArray<string> = FORMATS_SCAN_DEFAULT,
): Promise<BarcodeDetectorInstance | null> {
  if (typeof window === "undefined") return null;
  const natif = creerBarcodeDetector(formats);
  if (natif) return natif;
  const { creerZxingDetector } = await import("./zxing-detector");
  return creerZxingDetector(formats);
}

/** Module 13 D1 : nom du moteur effectivement utilise (telemetry/debug). */
export function nomMoteurDetection(): "native" | "zxing" | "none" {
  if (typeof window === "undefined") return "none";
  return window.BarcodeDetector ? "native" : "zxing";
}
