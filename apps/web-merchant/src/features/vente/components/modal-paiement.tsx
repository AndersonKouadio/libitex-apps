"use client";

import { Button, CloseButton } from "@heroui/react";
import { Banknote, Smartphone, CreditCard, Landmark, type LucideIcon } from "lucide-react";
import { MethodePaiement } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  total: number;
  enCours: boolean;
  onPayer: (methode: string) => void;
  onFermer: () => void;
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

export function ModalPaiement({ total, enCours, onPayer, onFermer }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-foreground">Mode de paiement</span>
        <CloseButton onPress={onFermer} aria-label="Fermer le paiement" />
      </div>
      {METHODES.map((m) => (
        <Button
          key={m.code}
          variant="outline"
          className="w-full justify-start gap-3 px-4 py-3.5 h-auto hover:border-accent/50 hover:shadow-sm"
          onPress={() => onPayer(m.code)}
          isDisabled={enCours}
        >
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.classes}`}>
            <m.icone size={18} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-medium text-foreground">{m.libelle}</span>
          <span className="ml-auto text-sm font-semibold text-foreground tabular-nums">
            {formatMontant(total)} F
          </span>
        </Button>
      ))}
    </div>
  );
}
