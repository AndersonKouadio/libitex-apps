"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ScanLine, Camera } from "lucide-react";

interface Props {
  /** Appele a chaque scan resolu (ENTER douchette ou code recu de la camera). */
  onScan: (code: string) => void | Promise<void>;
  /** Ouvre la modale camera (si parent gere). */
  onOuvrirCamera?: () => void;
  className?: string;
}

/**
 * Champ de scan global au POS. Compatible :
 * - Douchette USB (keyboard wedge) : tape les chiffres + ENTER, on capture
 *   et on declenche onScan(code). Input vide apres scan.
 * - Saisie manuelle : si caissier connait le code par cœur
 * - Camera : bouton dedicale pour ouvrir la modale scanner
 *
 * Pour eviter l'interference avec d'autres inputs (modale paiement,
 * quantite, remise...), le champ n'a pas d'autofocus global agressif.
 * Le caissier clique dessus, scan, le focus reste tant qu'il ne clique
 * pas ailleurs. La douchette frappe alors directement dans le bon champ.
 */
export function BarreScan({ onScan, onOuvrirCamera, className = "" }: Props) {
  const [valeur, setValeur] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Scanner ou saisir un code"
          aria-label="Scanner un produit"
          className="w-full h-9 pl-7 pr-2 text-sm rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-muted"
        />
      </div>
      {onOuvrirCamera && (
        <button
          type="button"
          onClick={onOuvrirCamera}
          aria-label="Scanner avec la camera"
          className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-secondary text-foreground"
        >
          <Camera size={14} />
        </button>
      )}
    </div>
  );
}
