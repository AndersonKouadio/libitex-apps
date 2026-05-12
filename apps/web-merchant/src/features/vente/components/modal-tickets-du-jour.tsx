"use client";

import { useEffect, useState } from "react";
import { Modal, Spinner, Chip, toast } from "@heroui/react";
import { Receipt, Printer, AlertCircle } from "lucide-react";
import { useTicketListQuery } from "../queries/ticket-list.query";
import { venteAPI } from "../apis/vente.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatMontant, formatHeure, cleJour } from "../utils/format";
import { imprimerTicket } from "../utils/imprimer-ticket";
import { BoutonPOS } from "./bouton-pos";
import type { ITicket } from "../types/vente.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Numero de session courante pour reimprimer avec le bon contexte. */
  numeroSession?: string;
}

/**
 * Liste des tickets COMPLETED du jour pour permettre une re-impression
 * (ticket egare, client revient, controle comptable). Filtre cote front
 * sur la date du jour pour eviter une explosion de l'historique. Le
 * caissier voit instantanement les 50 derniers tickets terminés.
 *
 * Pas de pagination volontairement : l'historique long est sur /rapports.
 */
export function ModalTicketsDuJour({ ouvert, onFermer, numeroSession }: Props) {
  const { token, boutiqueActive, utilisateur } = useAuth();
  const query = useTicketListQuery({ statut: "COMPLETED", page: 1 });
  const [enImpression, setEnImpression] = useState<string | null>(null);

  useEffect(() => {
    if (ouvert) query.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  // Filtre tickets COMPLETED du jour (la backend renvoie l'historique
  // complet, on borne au jour pour rester focus operationnel).
  const cleAujourdhui = cleJour(new Date().toISOString());
  const tickets = (query.data?.data ?? [])
    .filter((t) => t.statut === "COMPLETED")
    .filter((t) => cleJour(t.completeLe ?? t.creeLe) === cleAujourdhui)
    .sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1));

  async function reimprimer(ticket: ITicket) {
    if (!token || !boutiqueActive) return;
    setEnImpression(ticket.id);
    try {
      // On recharge le ticket complet pour avoir les supplements et notes
      // (la liste paginee renvoie une version allegee).
      const detail = await venteAPI.obtenirTicket(token, ticket.id);
      const caissier = `${utilisateur?.prenom ?? ""} ${utilisateur?.nomFamille ?? ""}`.trim();
      const res = await imprimerTicket(
        detail,
        { nom: boutiqueActive.nom, devise: boutiqueActive.devise },
        0, // pas de monnaie a re-rendre lors d'une reimpression
        { caissier: caissier || undefined, numeroSession },
      );
      if (res.mode === "USB") {
        toast.success("Ticket reimprime");
      } else if (res.mode === "HTML" && res.fallback) {
        toast.warning("Imprimante non detectee, ticket ouvert dans le navigateur");
      } else {
        toast.success("Ticket ouvert pour impression");
      }
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Echec de la reimpression");
    } finally {
      setEnImpression(null);
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Receipt className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Tickets du jour</Modal.Heading>
          </Modal.Header>

          <Modal.Body>
            {query.isLoading ? (
              <div className="py-10 text-center">
                <Spinner size="sm" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-10 text-center">
                <Receipt size={28} className="text-muted/30 mx-auto mb-2" />
                <p className="text-sm text-foreground">Aucun ticket termine aujourd&apos;hui</p>
                <p className="text-xs text-muted mt-1">
                  Les tickets encaisses apparaissent ici pour reimpression.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t.id} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground font-mono">
                          {t.numeroTicket}
                        </p>
                        <Chip variant="soft" size="sm" className="text-success">Terminé</Chip>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {formatHeure(t.completeLe ?? t.creeLe)}
                        {t.nomClient && ` · ${t.nomClient}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatMontant(t.total)}
                        <span className="text-xs font-normal text-muted ml-0.5">F</span>
                      </p>
                    </div>
                    <BoutonPOS
                      variant="outline"
                      className="gap-1.5"
                      onPress={() => reimprimer(t)}
                      isDisabled={enImpression === t.id}
                    >
                      {enImpression === t.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <>
                          <Printer size={14} />
                          Reimprimer
                        </>
                      )}
                    </BoutonPOS>
                  </li>
                ))}
              </ul>
            )}

            {tickets.length > 0 && (
              <p className="text-[11px] text-muted text-center mt-3 flex items-center justify-center gap-1.5">
                <AlertCircle size={11} />
                <span>
                  {`${tickets.length} ticket${tickets.length > 1 ? "s" : ""} du jour. L'historique complet est dans Rapports.`}
                </span>
              </p>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
