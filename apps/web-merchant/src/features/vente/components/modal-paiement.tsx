"use client";

import { useState } from "react";
import { X, Banknote, Smartphone, CreditCard, Landmark } from "lucide-react";
import { MethodePaiement } from "../types/vente.type";

interface Props {
  total: number;
  enCours: boolean;
  onPayer: (methode: string) => void;
  onFermer: () => void;
}

const METHODES = [
  { code: MethodePaiement.CASH, libelle: "Especes", icone: Banknote, couleur: "#059669" },
  { code: MethodePaiement.MOBILE_MONEY, libelle: "Mobile Money", icone: Smartphone, couleur: "#D97706" },
  { code: MethodePaiement.CARD, libelle: "Carte bancaire", icone: CreditCard, couleur: "#2563EB" },
  { code: MethodePaiement.BANK_TRANSFER, libelle: "Virement", icone: Landmark, couleur: "#7C3AED" },
];

function formatPrix(montant: number) {
  return new Intl.NumberFormat("fr-FR").format(montant);
}

export function ModalPaiement({ total, enCours, onPayer, onFermer }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-neutral-700">Mode de paiement</span>
        <button onClick={onFermer} className="text-neutral-400 hover:text-neutral-600 p-0.5">
          <X size={16} />
        </button>
      </div>
      {METHODES.map((m) => (
        <button
          key={m.code}
          onClick={() => onPayer(m.code)}
          disabled={enCours}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm active:scale-[0.99] disabled:opacity-40 transition-all"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${m.couleur} 10%, white)`, color: m.couleur }}
          >
            <m.icone size={18} strokeWidth={1.8} />
          </div>
          <span className="text-sm font-medium text-neutral-700">{m.libelle}</span>
          <span className="ml-auto text-sm font-semibold text-neutral-900 tabular-nums">
            {formatPrix(total)} F
          </span>
        </button>
      ))}
    </div>
  );
}
