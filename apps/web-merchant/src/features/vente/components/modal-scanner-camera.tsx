"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "@heroui/react";
import { ScanLine, X, AlertCircle, Zap, ZapOff, RotateCcw } from "lucide-react";
import {
  creerDetecteur, nomMoteurDetection,
  type BarcodeDetectorInstance,
} from "@/lib/scan/barcode-detector";
import { bipScanReussi } from "@/lib/scan/audio-beep";
import {
  supporteMediaDevices, ouvrirFluxCamera, compterCameras,
  supporteTorch, basculerTorch, fermerFluxCamera,
  type FacingMode,
} from "@/lib/scan/camera-stream";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  onScan: (code: string) => void;
}

/**
 * Modale qui ouvre la camera et detecte les codes-barres en continu avec
 * l'API native BarcodeDetector. Au premier scan reussi, declenche onScan()
 * et ferme.
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
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [plusieursCameras, setPlusieursCameras] = useState(false);
  const [torchDispo, setTorchDispo] = useState(false);
  const [torchActif, setTorchActif] = useState(false);

  useEffect(() => {
    if (!ouvert) return;

    setErreur(null);

    // Module 13 D1 : on ne refuse plus si BarcodeDetector natif absent —
    // creerDetecteur() retourne automatiquement le fallback ZXing
    // (iOS Safari, Firefox, Samsung Internet, Opera). Seul getUserMedia
    // reste indispensable (toujours present sur les navigateurs modernes).
    if (!supporteMediaDevices()) {
      setSupporte(false);
      return;
    }
    setSupporte(true);
    dejaTrouveRef.current = false;
    setTorchDispo(false);
    setTorchActif(false);

    let arrete = false;

    (async () => {
      // Module 13 D1 : factory async qui choisit natif vs ZXing.
      detectorRef.current = await creerDetecteur();
      if (arrete) return;
      if (process.env.NODE_ENV !== "production") {
        console.info(`[scan] moteur : ${nomMoteurDetection()}`);
      }

      // Detecte si plusieurs cameras sont disponibles (active le switch).
      const nb = await compterCameras();
      setPlusieursCameras(nb >= 2);

      try {
        const stream = await ouvrirFluxCamera(facingMode);
        if (arrete) {
          fermerFluxCamera(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Detecte le support torch APRES acquisition du stream.
        const track = stream.getVideoTracks()[0];
        setTorchDispo(supporteTorch(track ?? null));

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
      fermerFluxCamera(streamRef.current);
      streamRef.current = null;
      detectorRef.current = null;
    };
  }, [ouvert, onScan, onFermer, facingMode]);

  async function clickTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const nouveau = !torchActif;
    const ok = await basculerTorch(track, nouveau);
    setTorchActif(ok ? nouveau : false);
  }

  function clickSwitchCamera() {
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
                  <p className="text-sm font-semibold text-foreground">Camera indisponible</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    L&apos;acces a la camera necessite HTTPS et une autorisation
                    dans votre navigateur. Verifiez les permissions ou
                    utilisez une douchette USB / saisissez le code manuellement.
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
                  <div className="w-11/12 max-w-[400px] h-40 border-2 border-accent rounded-lg shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]" />
                </div>
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  {torchDispo && (
                    <button
                      type="button"
                      onClick={clickTorch}
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
                      onClick={clickSwitchCamera}
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
