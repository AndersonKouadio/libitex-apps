"use client";

import { useEffect, useRef } from "react";
import { Modal, toast } from "@heroui/react";
import { CheckCircle2, Printer, MessageCircle } from "lucide-react";
import { formatMontant } from "../utils/format";
import { imprimerTicket } from "../utils/imprimer-ticket";
import { BoutonPOS } from "./bouton-pos";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePreferencesPOS } from "@/lib/preferences-pos";
import type { ITicket } from "../types/vente.type";

interface Props {
  numeroTicket: string;
  total: number;
  monnaie: number;
  ticket?: ITicket;
  /** Numero de session caisse pour l'impression (tracabilite). */
  numeroSession?: string;
  onNouvelle: () => void;
}

export function ConfirmationVente({
  numeroTicket, total, monnaie, ticket, numeroSession, onNouvelle,
}: Props) {
  const { boutiqueActive, utilisateur } = useAuth();
  const prefs = usePreferencesPOS();
  // Garde anti-double-print : l'effet pourrait re-fire (StrictMode, re-render).
  const dejaImprimeRef = useRef(false);

  async function handleImprimer() {
    if (!ticket || !boutiqueActive) return;
    const caissier = `${utilisateur?.prenom ?? ""} ${utilisateur?.nomFamille ?? ""}`.trim();
    try {
      await imprimerTicket(
        ticket,
        { nom: boutiqueActive.nom, devise: boutiqueActive.devise },
        monnaie,
        { caissier: caissier || undefined, numeroSession },
      );
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur a l'impression");
    }
  }

  // Auto-print : si la preference est active et qu'on a un ticket reel,
  // declenche l'impression direct au montage de la confirmation. Le caissier
  // n'a rien a cliquer.
  //
  // Fix I3 : `handleImprimer` est async — sans .catch() ici, une erreur
  // synchrone (ex. throw avant le try interne) deviendrait une unhandled
  // promise rejection qui crashe React DevTools. On garde le toast de
  // handleImprimer et on log defensivement les cas inattendus.
  useEffect(() => {
    if (!prefs.imprimerAuto) return;
    if (!ticket || !boutiqueActive) return;
    if (dejaImprimeRef.current) return;
    dejaImprimeRef.current = true;
    handleImprimer().catch((err) => {
      console.error("Auto-impression : erreur inattendue", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Numero WhatsApp du client + message pre-rempli (numero ticket + total
  // + monnaie a rendre). Le caissier ouvre WhatsApp en 1 clic, envoie au
  // client comme accuse de reception / recu.
  const numeroBrut = ticket?.telephoneClient?.replace(/[^\d]/g, "");
  const lienWhatsApp = numeroBrut && ticket && boutiqueActive
    ? `https://wa.me/${numeroBrut}?text=${encodeURIComponent(
      `Bonjour, merci pour votre achat chez ${boutiqueActive.nom}.\n`
      + `Ticket: ${ticket.numeroTicket}\n`
      + `Total: ${formatMontant(ticket.total)} ${boutiqueActive.devise ?? "F CFA"}`
      + (monnaie > 0 ? `\nMonnaie rendue: ${formatMontant(monnaie)} F` : "")
    )}`
    : null;

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
            {lienWhatsApp && (
              <a
                href={lienWhatsApp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/15 transition-colors"
              >
                <MessageCircle size={16} />
                Envoyer le recu par WhatsApp
              </a>
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
