"use client";

import { Banknote, Smartphone, CreditCard, Landmark, type LucideIcon } from "lucide-react";
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

export function ModalPaiement({ total, enCours, onPayer }: Props) {
  return (
    <div className="space-y-2">
      {METHODES.map((m) => (
        <BoutonPOS
          key={m.code}
          variant="outline"
          className="w-full justify-start px-4 hover:border-accent/50 hover:shadow-sm"
          onPress={() => onPayer(m.code)}
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
