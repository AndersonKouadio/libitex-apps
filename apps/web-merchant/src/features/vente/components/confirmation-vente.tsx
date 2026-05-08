"use client";

import { Modal } from "@heroui/react";
import { CheckCircle2, Printer } from "lucide-react";
import { formatMontant } from "../utils/format";
import { imprimerTicket } from "../utils/imprimer-ticket";
import { BoutonPOS } from "./bouton-pos";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ITicket } from "../types/vente.type";

interface Props {
  numeroTicket: string;
  total: number;
  monnaie: number;
  ticket?: ITicket;
  onNouvelle: () => void;
}

export function ConfirmationVente({ numeroTicket, total, monnaie, ticket, onNouvelle }: Props) {
  const { boutiqueActive } = useAuth();

  function handleImprimer() {
    if (!ticket || !boutiqueActive) return;
    imprimerTicket(ticket, { nom: boutiqueActive.nom, devise: boutiqueActive.devise }, monnaie);
  }

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onNouvelle(); }}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Body className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={28} strokeWidth={2} className="text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Vente enregistrée</h3>
            <p className="text-sm text-muted mt-1 font-mono">{numeroTicket}</p>
            <p className="text-4xl font-bold text-accent mt-4 tabular-nums">
              {formatMontant(total)}
              <span className="text-base font-normal text-muted ml-1.5">F CFA</span>
            </p>
            {monnaie > 0 && (
              <p className="text-base font-semibold text-warning mt-3 tabular-nums">
                Monnaie à rendre : {formatMontant(monnaie)} F
              </p>
            )}
          </Modal.Body>
          <Modal.Footer className="flex-col gap-2">
            {ticket && (
              <BoutonPOS
                variant="outline"
                className="w-full gap-2"
                onPress={handleImprimer}
              >
                <Printer size={16} />
                Imprimer le ticket
              </BoutonPOS>
            )}
            <BoutonPOS variant="primary" className="w-full" onPress={onNouvelle}>
              Nouvelle vente
            </BoutonPOS>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
