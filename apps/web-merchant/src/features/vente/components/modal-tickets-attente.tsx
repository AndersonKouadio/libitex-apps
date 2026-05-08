"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Spinner, toast } from "@heroui/react";
import { PauseCircle, RotateCcw, Trash2, Receipt } from "lucide-react";
import { useTicketListQuery } from "../queries/ticket-list.query";
import { useAnnulerTicketMutation } from "../queries/ticket-annuler.mutation";
import { venteAPI } from "../apis/vente.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useInvalidateVenteQuery } from "../queries/index.query";
import { formatMontant, formatDate } from "../utils/format";
import type { ITicket, ILigneTicket } from "../types/vente.type";
import type { IProduit } from "@/features/catalogue/types/produit.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  emplacementId: string;
  produits: IProduit[];
  onReprendre: (
    lignes: ILigneTicket[],
    images: Map<string, string | null>,
  ) => void;
}

export function ModalTicketsAttente({ ouvert, onFermer, emplacementId, produits, onReprendre }: Props) {
  const { token } = useAuth();
  const annuler = useAnnulerTicketMutation();
  const invalidate = useInvalidateVenteQuery();
  const [enChargement, setEnChargement] = useState<string | null>(null);

  const { data: ticketsData, isLoading, refetch } = useTicketListQuery({
    statut: "PARKED",
    page: 1,
  });

  // Toujours refetch a l'ouverture: l'utilisateur peut avoir parke un ticket
  // depuis un autre onglet ou une autre boutique apres le dernier fetch.
  useEffect(() => {
    if (ouvert) refetch();
  }, [ouvert, refetch]);

  const tickets = (ticketsData?.data ?? []).filter((t) => t.statut === "PARKED");

  // Index par varianteId pour enrichir les lignes du ticket avec
  // l'image et les reglages d'unite (qui ne sont pas stockes sur ticket_lines).
  const imagesParVariante = new Map<string, string | null>();
  const variantesParId = new Map<string, IProduit["variantes"][number]>();
  for (const p of produits) {
    const img = p.images?.[0] ?? null;
    for (const v of p.variantes) {
      imagesParVariante.set(v.id, img);
      variantesParId.set(v.id, v);
    }
  }

  async function reprendre(ticket: ITicket) {
    if (!token) return;
    setEnChargement(ticket.id);
    try {
      const detail = await venteAPI.obtenirTicket(token, ticket.id);
      await venteAPI.annuler(token, ticket.id);

      // Recopie les reglages de vente depuis la variante actuelle :
      // ticket_lines ne stocke pas uniteVente/pasMin/prixParUnite.
      const lignesEnrichies: ILigneTicket[] = detail.lignes.map((l) => {
        const v = variantesParId.get(l.varianteId);
        return {
          ...l,
          uniteVente: v?.uniteVente ?? l.uniteVente,
          pasMin: v?.pasMin ?? null,
          prixParUnite: v?.prixParUnite ?? false,
        };
      });

      onReprendre(lignesEnrichies, imagesParVariante);
      invalidate();
      onFermer();
      toast.success(`Ticket ${detail.numeroTicket} repris`);
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Impossible de reprendre le ticket");
    } finally {
      setEnChargement(null);
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <PauseCircle className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Tickets en attente</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-2">
            {isLoading ? (
              <div className="py-12 flex justify-center"><Spinner /></div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt size={32} strokeWidth={2} className="text-muted/30 mx-auto mb-3" />
                <p className="text-sm text-foreground">Aucun ticket en attente</p>
                <p className="text-xs text-muted mt-1">
                  Quand vous mettez un panier en attente, vous le retrouverez ici
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-border p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-foreground">{t.numeroTicket}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {t.nomClient ?? "Client de passage"} · {formatDate(t.creeLe)}
                      </p>
                      <p className="text-sm font-semibold text-foreground tabular-nums mt-1">
                        {formatMontant(t.total)}
                        <span className="text-[10px] font-normal text-muted ml-0.5">F</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        className="text-muted hover:text-danger hover:bg-danger/5 w-11 h-11 min-w-0 p-0"
                        onPress={() => annuler.mutate(t.id)}
                        isDisabled={enChargement === t.id || annuler.isPending}
                        aria-label="Annuler le ticket"
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </Button>
                      <Button
                        variant="primary"
                        className="h-11 px-4 gap-2"
                        onPress={() => reprendre(t)}
                        isDisabled={enChargement !== null}
                      >
                        {enChargement === t.id ? <Spinner size="sm" /> : <RotateCcw size={16} strokeWidth={2} />}
                        Reprendre
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Fermer</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
