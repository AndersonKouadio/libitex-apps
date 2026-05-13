"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { supporteWebUsb, supporteWebBluetooth } from "@/lib/escpos";

const STORAGE_KEY = "libitex_banniere_compat_dismissed";

/**
 * Module 13 D3 : bannière proactive sur le POS si le materiel d'impression
 * n'est pas disponible sur ce navigateur. Affichee une fois par session
 * (dismiss persiste en localStorage).
 *
 * Cas declencheur : ni WebUSB ni Web Bluetooth supportes (typiquement
 * Safari, Firefox bureau, Firefox Android). Permet de prevenir le caissier
 * que l'impression directe ne marchera pas avant de faire une vente.
 *
 * Discrete : se ferme avec un X et ne reapparaît plus jusqu'au prochain
 * vidage localStorage (changement de navigateur, reset).
 */
export function BanniereCompatMateriel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (dismissed) return;
    // Aucun transport d'impression directe disponible -> on previent
    if (!supporteWebUsb() && !supporteWebBluetooth()) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-3 sm:mx-4 mt-2 p-3 rounded-lg border border-warning/30 bg-warning/5 flex items-start gap-2 text-xs">
      <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">
          Impression directe indisponible sur ce navigateur
        </p>
        <p className="text-muted mt-0.5 leading-relaxed">
          Pour imprimer sans dialog, utilisez <strong>Chrome</strong>,
          <strong> Edge</strong> ou <strong>Brave</strong>. Sinon la
          dialog d&apos;impression classique s&apos;ouvre apres chaque vente.{" "}
          <Link href="/parametres/imprimante" className="text-accent hover:underline">
            En savoir plus
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="text-muted hover:text-foreground p-0.5 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
