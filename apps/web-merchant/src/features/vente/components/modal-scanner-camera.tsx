"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "@heroui/react";
import { ScanLine, X, AlertCircle } from "lucide-react";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  onScan: (code: string) => void;
}

// Declaration minimale du BarcodeDetector (pas dans lib.dom.d.ts du TS standard).
interface BarcodeDetectionResult {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<BarcodeDetectionResult[]>;
}
interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): BarcodeDetectorInstance;
}
declare global {
  interface Window { BarcodeDetector?: BarcodeDetectorCtor }
}

const FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "code_93",
  "itf", "qr_code",
];

/**
 * Modale qui ouvre la camera et detecte les codes-barres en continu avec
 * l'API native BarcodeDetector (Chrome desktop+Android, Edge). Au premier
 * scan reussi, declenche onScan() et ferme.
 *
 * Fallback : si BarcodeDetector n'est pas supporte (Safari, Firefox), on
 * affiche un message et le caissier doit utiliser la douchette ou saisir.
 *
 * Beep court au scan via Web Audio (pas de fichier audio, pas de network).
 */
export function ModalScannerCamera({ ouvert, onFermer, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const dejaTrouveRef = useRef(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [supporte, setSupporte] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ouvert) return;

    const Ctor = typeof window !== "undefined" ? window.BarcodeDetector : undefined;
    if (!Ctor) {
      setSupporte(false);
      return;
    }
    setSupporte(true);
    detectorRef.current = new Ctor({ formats: FORMATS });
    dejaTrouveRef.current = false;

    let arrete = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (arrete) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Boucle de detection : on lit une frame toutes les 200ms (pas de
        // requestAnimationFrame pour ne pas griller le CPU sur du Xiaomi
        // d'entree de gamme).
        const detect = async () => {
          if (arrete || dejaTrouveRef.current) return;
          const detector = detectorRef.current;
          const video = videoRef.current;
          if (!detector || !video || video.readyState < 2) {
            loopRef.current = window.setTimeout(detect, 200);
            return;
          }
          try {
            const results = await detector.detect(video);
            if (results.length > 0 && !dejaTrouveRef.current) {
              dejaTrouveRef.current = true;
              bipScanReussi();
              onScan(results[0]!.rawValue);
              onFermer();
              return;
            }
          } catch {
            // detect() peut throw sur certaines frames, on continue
          }
          loopRef.current = window.setTimeout(detect, 200);
        };
        detect();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Camera indisponible";
        setErreur(/permission|denied|notallowed/i.test(message)
          ? "Acces a la camera refuse"
          : message);
      }
    })();

    return () => {
      arrete = true;
      if (loopRef.current !== null) clearTimeout(loopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ouvert, onScan, onFermer]);

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Scanner un code-barres</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="p-0">
            {supporte === false ? (
              <div className="p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={32} className="text-warning" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Camera non supportee</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Le scan camera est disponible sur Chrome, Edge ou Brave. Sur Safari et Firefox,
                    utilisez une douchette USB ou saisissez le code manuellement.
                  </p>
                </div>
              </div>
            ) : erreur ? (
              <div className="p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={32} className="text-danger" />
                <p className="text-sm text-foreground">{erreur}</p>
              </div>
            ) : (
              <div className="relative bg-black aspect-square sm:aspect-video w-full">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 max-w-[280px] h-32 border-2 border-accent rounded-lg shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]" />
                </div>
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 text-white text-xs">
                  <ScanLine size={14} />
                  <span>Cadrez le code dans la zone</span>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer} className="gap-1.5">
              <X size={14} /> Fermer
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/**
 * Petit beep de confirmation (1 sinusoide 880Hz pendant 120ms). Utilise
 * Web Audio direct pour ne pas charger de fichier sound et ne pas declencher
 * la permission audio.
 */
function bipScanReussi(): void {
  try {
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    /* silencieux : le scan reussit meme sans son */
  }
}
