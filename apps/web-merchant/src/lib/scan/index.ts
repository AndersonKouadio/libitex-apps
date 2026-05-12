/**
 * API publique du module `lib/scan/`. Centralise les helpers pour la
 * detection de codes-barres et le pilotage de la camera (WebRTC).
 */

export {
  FORMATS_SCAN_DEFAULT, creerBarcodeDetector, supporteBarcodeDetector,
} from "./barcode-detector";
export type {
  BarcodeDetectionResult, BarcodeDetectorInstance, BarcodeDetectorCtor,
} from "./barcode-detector";

export { bipScanReussi } from "./audio-beep";

export {
  supporteMediaDevices, ouvrirFluxCamera, compterCameras,
  supporteTorch, basculerTorch, fermerFluxCamera,
} from "./camera-stream";
export type { FacingMode, CapsTorch, ConstraintsTorch } from "./camera-stream";
