"use client";

import { useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { ScanLine, Camera, Loader2 } from "lucide-react";

/** API exposee par BarreScan pour permettre au parent de re-focus
 *  apres fermeture d'une modale (m4 + I9). */
export interface BarreScanHandle {
  focus(): void;
}

interface Props {
  /** Appele a chaque scan resolu (ENTER douchette ou code recu de la camera). */
  onScan: (code: string) => void | Promise<void>;
  /** Ouvre la modale camera (si parent gere). */
  onOuvrirCamera?: () => void;
  /** Vrai si une recherche API est en cours (affiche un spinner inline). */
  scanEnCours?: boolean;
  /** Ref imperative pour permettre au parent de re-focus apres modale. */
  scanRef?: Ref<BarreScanHandle>;
  className?: string;
}

/**
 * Champ de scan global au POS. Compatible :
 * - Douchette USB (keyboard wedge) : tape les chiffres + ENTER, on capture
 *   et on declenche onScan(code). Input vide apres scan.
 * - Saisie manuelle : si caissier connait le code par cœur
 * - Camera : bouton dedicale pour ouvrir la modale scanner
 *
 * Fix I9 : autofocus au mount + ref imperative `scanRef` pour que le
 * parent (page POS) puisse re-focuser apres fermeture d'une modale (paiement,
 * remise, supplements...). Sans ca, la douchette frappe dans le vide.
 */
export function BarreScan({ onScan, onOuvrirCamera, scanEnCours, scanRef, className = "" }: Props) {
  const [valeur, setValeur] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fix I9 : focus au mount initial — le caissier peut scanner immediatement
  // sans cliquer sur le champ.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Expose une API imperative `focus()` pour permettre au parent de
  // re-focuser apres fermeture d'une modale.
  useImperativeHandle(scanRef, () => ({
    focus: () => inputRef.current?.focus(),
  }), []);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = valeur.trim();
    if (!code) return;
    setValeur("");
    onScan(code);
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative flex-1">
        <ScanLine
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          // Fix C4 : inputMode="text" (pas numeric) — les codes-barres
          // peuvent contenir des lettres (Code-128, QR-code) ou les SKU
          // internes sont alphanumeriques.
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Scanner ou saisir un code"
          aria-label="Scanner un produit"
          className="w-full h-9 pl-7 pr-8 text-sm rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-muted"
        />
        {/* Fix m4 : spinner inline pendant la recherche API (fallback cache).
            Visible seulement quand `scanEnCours` est true (>200ms cote parent). */}
        {scanEnCours && (
          <Loader2
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-accent animate-spin"
            aria-label="Recherche en cours"
          />
        )}
      </div>
      {onOuvrirCamera && (
        <button
          type="button"
          onClick={onOuvrirCamera}
          disabled={scanEnCours}
          aria-label="Scanner avec la camera"
          className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-secondary text-foreground disabled:opacity-50"
        >
          <Camera size={14} />
        </button>
      )}
    </div>
  );
}
