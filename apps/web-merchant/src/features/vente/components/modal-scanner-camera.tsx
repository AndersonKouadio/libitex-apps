"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "@heroui/react";
import { ScanLine, X, AlertCircle, Zap, ZapOff, RotateCcw } from "lucide-react";

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

// Capabilities/constraints etendues pour torch (pas dans lib.dom.d.ts).
type CapsTorch = MediaTrackCapabilities & { torch?: boolean };
type ConstraintsTorch = MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> };

const FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "code_93",
  "itf", "qr_code",
];

type FacingMode = "environment" | "user";

/**
 * Modale qui ouvre la camera et detecte les codes-barres en continu avec
 * l'API native BarcodeDetector (Chrome desktop+Android, Edge). Au premier
 * scan reussi, declenche onScan() et ferme.
 *
 * Fonctionnalites :
 * - Torch (flash) si le device le supporte (Android Chrome principalement)
 * - Switch camera front/back si plusieurs disponibles
 * - Beep court au scan via Web Audio
 *
 * Fallback : si BarcodeDetector n'est pas supporte (Safari, Firefox), on
 * affiche un message et le caissier doit utiliser la douchette ou saisir.
 */
export function ModalScannerCamera({ ouvert, onFermer, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const dejaTrouveRef = useRef(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [supporte, setSupporte] = useState<boolean | null>(null);
  // Fix I6 : camera selectionnee. Default "environment" (camera arriere)
  // pour scan. Switchable si plusieurs cameras detectees.
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [plusieursCameras, setPlusieursCameras] = useState(false);
  // Fix I4 : torch (flash) si le device le supporte.
  const [torchSupporte, setTorchSupporte] = useState(false);
  const [torchActif, setTorchActif] = useState(false);

  useEffect(() => {
    if (!ouvert) return;

    setErreur(null);

    const Ctor = typeof window !== "undefined" ? window.BarcodeDetector : undefined;
    if (!Ctor) {
      setSupporte(false);
      return;
    }
    // Fix I3 : verifier mediaDevices avant de tenter getUserMedia.
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setSupporte(false);
      return;
    }
    setSupporte(true);
    detectorRef.current = new Ctor({ formats: FORMATS });
    dejaTrouveRef.current = false;
    setTorchSupporte(false);
    setTorchActif(false);

    let arrete = false;

    (async () => {
      // Fix I6 : detecte si plusieurs cameras sont disponibles pour activer
      // le bouton de switch. Silencieux si enumerateDevices echoue (Safari
      // sans permission etc.) — on garde juste un seul bouton sans toggle.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        setPlusieursCameras(cams.length >= 2);
      } catch {
        setPlusieursCameras(false);
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
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

        // Fix I4 : detecte le support torch APRES que le stream soit acquis.
        // `getCapabilities()` n'est pas dispo sur tous les browsers, on
        // degrade silencieusement.
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === "function") {
          const caps = track.getCapabilities() as CapsTorch;
          setTorchSupporte(Boolean(caps.torch));
        }

        // Boucle de detection : 1 frame toutes les 200ms (CPU friendly).
        // Fix C1 + I2 : verifier arrete/dejaTrouve AVANT et APRES detect().
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
            if (arrete || dejaTrouveRef.current) return;
            const first = results[0];
            if (first?.rawValue) {
              dejaTrouveRef.current = true;
              bipScanReussi();
              onScan(first.rawValue);
              onFermer();
              return;
            }
          } catch {
            // detect() peut throw sur certaines frames, on continue
          }
          if (!arrete) loopRef.current = window.setTimeout(detect, 200);
        };
        detect();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Camera indisponible";
        setErreur(/permission|denied|notallowed/i.test(message)
          ? "Acces a la camera refuse — autorisez la camera dans les parametres du navigateur"
          : message);
      }
    })();

    return () => {
      arrete = true;
      if (loopRef.current !== null) clearTimeout(loopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      detectorRef.current = null;
    };
  }, [ouvert, onScan, onFermer, facingMode]);

  /**
   * Toggle torch via `applyConstraints` sur la video track. Si la commande
   * echoue (cas rare : torch reconnu mais bloque par le pilote), on revert
   * le state pour rester coherent avec l'etat materiel.
   */
  async function basculerTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const nouveauEtat = !torchActif;
    try {
      await track.applyConstraints({ advanced: [{ torch: nouveauEtat }] } as ConstraintsTorch);
      setTorchActif(nouveauEtat);
    } catch {
      // Reverse : torch refusee par le hardware
      setTorchActif(false);
    }
  }

  function switcherCamera() {
    // Fix I6 : alterne entre arriere/avant. L'effet redemarre le stream.
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setTorchActif(false);
  }

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
                    Le scan camera est disponible sur Chrome, Edge ou Brave en HTTPS.
                    Sur Safari, Firefox ou en HTTP, utilisez une douchette USB ou saisissez le code manuellement.
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
                {/* Fix I5 : viseur agrandi (max-w-[400px] h-40) pour scanner
                    confortablement depuis un telephone wide. */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11/12 max-w-[400px] h-40 border-2 border-accent rounded-lg shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]" />
                </div>
                {/* Controles flottants : torch (si supporte) + switch camera */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  {torchSupporte && (
                    <button
                      type="button"
                      onClick={basculerTorch}
                      aria-label={torchActif ? "Eteindre le flash" : "Allumer le flash"}
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                        torchActif
                          ? "bg-warning text-warning-foreground"
                          : "bg-black/50 text-white hover:bg-black/70"
                      }`}
                    >
                      {torchActif ? <Zap size={18} /> : <ZapOff size={18} />}
                    </button>
                  )}
                  {plusieursCameras && (
                    <button
                      type="button"
                      onClick={switcherCamera}
                      aria-label="Changer de camera"
                      className="h-10 w-10 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/70"
                    >
                      <RotateCcw size={18} />
                    </button>
                  )}
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
 * Petit beep de confirmation (1 sinusoide 880Hz pendant 120ms).
 *
 * Fix C5 : AudioContext singleton (lazy-created au premier scan), reutilise
 * pour tous les scans suivants. Sans ca, Safari iOS crashe apres ~6
 * AudioContext crees (limite navigateur).
 */
let audioCtxSingleton: AudioContext | null = null;

function bipScanReussi(): void {
  try {
    if (!audioCtxSingleton) {
      const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      audioCtxSingleton = new AC();
    }
    const ctx = audioCtxSingleton;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* silencieux */
  }
}
