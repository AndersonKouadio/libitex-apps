"use client";

import { CheckCircle2 } from "lucide-react";

interface Props {
  numeroTicket: string;
  total: number;
  monnaie: number;
  onNouvelle: () => void;
}

function formatPrix(montant: number) {
  return new Intl.NumberFormat("fr-FR").format(montant);
}

export function ConfirmationVente({ numeroTicket, total, monnaie, onNouvelle }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900">Vente enregistree</h3>
        <p className="text-sm text-neutral-500 mt-1 font-mono">{numeroTicket}</p>
        <p className="text-3xl font-bold text-teal-600 mt-4 tabular-nums">
          {formatPrix(total)} <span className="text-base font-normal text-neutral-400">F CFA</span>
        </p>
        {monnaie > 0 && (
          <p className="text-sm text-amber-600 mt-2 tabular-nums">
            Monnaie a rendre : {formatPrix(monnaie)} F
          </p>
        )}
        <button
          onClick={onNouvelle}
          className="mt-6 w-full py-3 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          Nouvelle vente
        </button>
      </div>
    </div>
  );
}
