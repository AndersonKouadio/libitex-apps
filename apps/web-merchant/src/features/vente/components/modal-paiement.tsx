"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import {
  Banknote, Smartphone, CreditCard, Landmark, ArrowLeft, type LucideIcon,
} from "lucide-react";
import { MethodePaiement } from "../types/vente.type";
import { formatMontant } from "../utils/format";
import { BoutonPOS } from "./bouton-pos";

interface Props {
  total: number;
  enCours: boolean;
  onPayer: (methode: string) => void;
  /** Conserve pour API compatibilite — fermeture geree par le Modal.Backdrop */
  onFermer?: () => void;
}

interface MethodeUI {
  code: string;
  libelle: string;
  icone: LucideIcon;
  classes: string;
}

const METHODES: MethodeUI[] = [
  { code: MethodePaiement.CASH, libelle: "Espèces", icone: Banknote, classes: "bg-success/10 text-success" },
  { code: MethodePaiement.MOBILE_MONEY, libelle: "Mobile Money", icone: Smartphone, classes: "bg-warning/10 text-warning" },
  { code: MethodePaiement.CARD, libelle: "Carte bancaire", icone: CreditCard, classes: "bg-accent/10 text-accent" },
  { code: MethodePaiement.BANK_TRANSFER, libelle: "Virement", icone: Landmark, classes: "bg-muted/10 text-muted" },
];

/** Billets ronds pour les quick buttons (FCA — coupures classiques BCEAO). */
const QUICK_RECU = [1000, 2000, 5000, 10000];

/**
 * Modale paiement en deux vues :
 * - Vue "choix methode" : 4 methodes a un clic
 * - Vue "calcul monnaie" (Especes uniquement) : saisie du recu, monnaie a rendre,
 *   quick buttons pour ajouter des billets ronds, validation
 *
 * Pour Mobile Money / Carte / Virement, on valide directement au montant exact
 * (pas de monnaie a rendre, le client paie pile).
 */
export function ModalPaiement({ total, enCours, onPayer }: Props) {
  /** null = vue choix, "CASH" = vue calcul monnaie. */
  const [methodeChoisie, setMethodeChoisie] = useState<string | null>(null);
  const [recu, setRecu] = useState<number>(total);

  // Re-init le montant recu quand le total change ou qu'on revient au choix
  useEffect(() => {
    if (methodeChoisie === null) setRecu(total);
  }, [total, methodeChoisie]);

  const monnaie = Math.max(0, recu - total);
  const insuffisant = recu < total;

  function choisir(methode: string) {
    if (methode === MethodePaiement.CASH) {
      setMethodeChoisie(methode);
      setRecu(total);
    } else {
      // Methodes electroniques : pas de calcul de monnaie, on valide direct
      onPayer(methode);
    }
  }

  function ajouterRecu(montant: number) {
    setRecu((r) => r + montant);
  }

  function reset() {
    setMethodeChoisie(null);
    setRecu(total);
  }

  // VUE 2 : calcul de monnaie (Especes)
  if (methodeChoisie === MethodePaiement.CASH) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft size={12} /> Changer de méthode
        </button>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <div>
            <label className="text-xs text-muted">Montant reçu (F CFA)</label>
            <input
              type="number"
              inputMode="numeric"
              value={recu || ""}
              onChange={(e) => setRecu(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              autoFocus
              className="w-full text-2xl font-semibold text-foreground tabular-nums bg-transparent outline-none focus:ring-0 mt-1"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RECU.map((m) => (
              <Button
                key={m}
                variant="ghost"
                className="h-7 px-2 text-xs border border-border tabular-nums"
                onPress={() => ajouterRecu(m)}
              >
                + {formatMontant(m)} F
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs text-muted hover:text-foreground ml-auto"
              onPress={() => setRecu(total)}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className={`rounded-lg p-3 text-center ${
          insuffisant
            ? "bg-danger/10 text-danger"
            : monnaie === 0
              ? "bg-muted/10 text-muted"
              : "bg-success/10 text-success"
        }`}>
          <p className="text-[10px] uppercase tracking-wider opacity-70">
            {insuffisant ? "Manquant" : "Monnaie à rendre"}
          </p>
          <p className="text-3xl font-bold tabular-nums tracking-tight mt-0.5">
            {formatMontant(insuffisant ? total - recu : monnaie)}
            <span className="text-sm font-normal opacity-60 ml-1">F</span>
          </p>
        </div>

        <BoutonPOS
          variant="primary"
          className="w-full"
          onPress={() => onPayer(MethodePaiement.CASH)}
          isDisabled={enCours || insuffisant}
        >
          {enCours ? "Validation..." : "Valider le paiement"}
        </BoutonPOS>
      </div>
    );
  }

  // VUE 1 : choix de methode
  return (
    <div className="space-y-2">
      {METHODES.map((m) => (
        <BoutonPOS
          key={m.code}
          variant="outline"
          className="w-full justify-start px-4 hover:border-accent/50 hover:shadow-sm"
          onPress={() => choisir(m.code)}
          isDisabled={enCours}
        >
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.classes}`}>
            <m.icone size={20} strokeWidth={2} />
          </span>
          <span className="text-sm font-medium text-foreground">{m.libelle}</span>
          <span className="ml-auto text-base font-semibold text-foreground tabular-nums">
            {formatMontant(total)} F
          </span>
        </BoutonPOS>
      ))}
    </div>
  );
}
