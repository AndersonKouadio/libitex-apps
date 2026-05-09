"use client";

import { useState, useMemo } from "react";
import {
  Modal, Button, Spinner, Chip, TextField, Label, Input, FieldError, TextArea,
} from "@heroui/react";
import {
  Lock, AlertTriangle, PauseCircle, ShoppingCart, Trash2, Clock,
} from "lucide-react";
import { useRecapitulatifFermetureQuery } from "../queries/session-active.query";
import { useSessionCaisse } from "../hooks/useSessionCaisse";
import { useAnnulerTicketMutation } from "@/features/vente/queries/ticket-annuler.mutation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  formatMontant, formatDateRelative, formatHeure, formatDuree,
} from "@/features/vente/utils/format";
import type { FondParMethode } from "../types/session-caisse.type";

interface Props {
  ouvert: boolean;
  sessionId: string | null;
  onFermer: () => void;
  /** Callback quand un ticket OPEN doit etre repris dans le panier pour encaissement */
  onReprendreTicket?: (ticketId: string) => void;
}

const METHODES_LABEL: Record<keyof FondParMethode, string> = {
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Carte",
  BANK_TRANSFER: "Virement",
};

export function ModalFermetureCaisse({ ouvert, sessionId, onFermer, onReprendreTicket }: Props) {
  const { token } = useAuth();
  const recap = useRecapitulatifFermetureQuery(ouvert ? sessionId : null);
  const { enCours: enCoursFermeture, fermer, reporterTicket } = useSessionCaisse(token);
  const annuler = useAnnulerTicketMutation();

  const [declare, setDeclare] = useState<Partial<FondParMethode>>({});
  const [commentaire, setCommentaire] = useState("");

  const ticketsOpen = recap.data?.ticketsEnCours.filter((t) => t.statut === "OPEN") ?? [];
  const ticketsParked = recap.data?.ticketsEnCours.filter((t) => t.statut === "PARKED") ?? [];

  // Theorique = openingFloat + ventilation paiements
  const theorique = useMemo<FondParMethode>(() => {
    if (!recap.data) return { CASH: 0, CARD: 0, MOBILE_MONEY: 0, BANK_TRANSFER: 0 };
    const opening = recap.data.session.fondInitial;
    const result = { ...opening };
    for (const v of recap.data.ventilationPaiements) {
      const m = v.methode as keyof FondParMethode;
      if (m in result) result[m] = (result[m] ?? 0) + v.total;
    }
    return result;
  }, [recap.data]);

  function ecart(m: keyof FondParMethode): number {
    return (declare[m] ?? 0) - theorique[m];
  }

  async function soumettreFermeture() {
    if (!sessionId) return;
    const ok = await fermer(sessionId, { fondFinalDeclare: declare, commentaire });
    if (ok) onFermer();
  }

  const peutFermer = ticketsOpen.length === 0;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <Lock className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Fermer la caisse</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-5">
            {recap.isLoading || !recap.data ? (
              <div className="py-12 flex justify-center"><Spinner /></div>
            ) : (
              <>
                {/* Recap session — date humaine d'abord, numero en discret */}
                <div className="rounded-xl border border-border p-3 flex items-center gap-3 bg-muted/5">
                  <Clock size={16} className="text-muted shrink-0" />
                  <div className="flex-1 text-xs min-w-0">
                    <p className="text-foreground font-medium">
                      {formatDateRelative(recap.data.session.ouvertA)} · depuis {formatHeure(recap.data.session.ouvertA)}
                      <span className="text-muted ml-1">
                        ({formatDuree(Math.round((Date.now() - new Date(recap.data.session.ouvertA).getTime()) / 60000))})
                      </span>
                    </p>
                    <p className="text-muted mt-0.5 truncate">
                      {recap.data.session.caissierNom} — {recap.data.session.emplacementNom}
                      <span className="font-mono ml-1.5 text-[10px] opacity-60">{recap.data.session.numeroSession}</span>
                    </p>
                    <p className="text-muted mt-0.5">
                      {recap.data.session.nombreTickets ?? 0} ticket(s) ·{" "}
                      <span className="tabular-nums">{formatMontant(recap.data.session.totalEncaisse ?? 0)} F</span> encaissé
                    </p>
                  </div>
                </div>

                {/* Tickets en cours - bloc bloquant */}
                {ticketsOpen.length + ticketsParked.length > 0 && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <AlertTriangle size={12} className="text-warning" />
                      <p className="font-medium text-warning">
                        {ticketsOpen.length + ticketsParked.length} ticket(s) non finalisé(s)
                      </p>
                    </div>
                    {ticketsOpen.length > 0 && (
                      <p className="text-xs text-muted">
                        Les tickets ouverts doivent être encaissés ou annulés avant de fermer.
                        Les tickets en attente peuvent être reportés à la prochaine session.
                      </p>
                    )}
                    <ul className="space-y-1.5">
                      {[...ticketsOpen, ...ticketsParked].map((t) => {
                        const estParked = t.statut === "PARKED";
                        return (
                          <li
                            key={t.id}
                            className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2"
                          >
                            <Chip className={`text-[10px] gap-1 shrink-0 ${
                              estParked ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
                            }`}>
                              {estParked ? <PauseCircle size={10} /> : <ShoppingCart size={10} />}
                              {estParked ? "En attente" : "Ouvert"}
                            </Chip>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono text-foreground truncate">{t.numeroTicket}</p>
                              <p className="text-xs font-semibold tabular-nums text-foreground">
                                {formatMontant(t.total)} F
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!estParked && onReprendreTicket && (
                                <Button
                                  variant="primary"
                                  className="h-8 px-2.5 text-xs"
                                  onPress={() => { onReprendreTicket(t.id); onFermer(); }}
                                >
                                  Encaisser
                                </Button>
                              )}
                              {estParked && (
                                <Button
                                  variant="secondary"
                                  className="h-8 px-2.5 text-xs"
                                  onPress={() => reporterTicket(t.id)}
                                  isDisabled={enCoursFermeture}
                                >
                                  Reporter
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                className="h-8 w-8 min-w-0 p-0 text-muted hover:text-danger"
                                onPress={() => annuler.mutate(t.id)}
                                isDisabled={annuler.isPending}
                                aria-label="Annuler"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Comptage par methode */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Comptage de fin de session</p>
                  <div className="space-y-1.5">
                    {(Object.keys(METHODES_LABEL) as Array<keyof FondParMethode>).map((m) => {
                      const t = theorique[m];
                      const d = declare[m] ?? 0;
                      const e = ecart(m);
                      const aSaisi = declare[m] !== undefined;
                      return (
                        <div
                          key={m}
                          className="rounded-lg border border-border p-3 grid grid-cols-12 gap-2 items-center"
                        >
                          <p className="col-span-3 text-sm text-foreground">{METHODES_LABEL[m]}</p>
                          <div className="col-span-3 text-xs">
                            <p className="text-muted">Théorique</p>
                            <p className="font-semibold tabular-nums text-foreground">
                              {formatMontant(t)} F
                            </p>
                          </div>
                          <div className="col-span-3">
                            <TextField
                              type="number"
                              value={String(declare[m] ?? "")}
                              onChange={(v) => setDeclare((p) => ({ ...p, [m]: Number(v) || 0 }))}
                              aria-label={`Compté ${METHODES_LABEL[m]}`}
                            >
                              <Label className="text-[10px] text-muted">Compté réel</Label>
                              <Input placeholder="0" min="0" className="h-8 text-sm" />
                              <FieldError />
                            </TextField>
                          </div>
                          <div className="col-span-3 text-xs text-right">
                            <p className="text-muted">Écart</p>
                            {aSaisi ? (
                              <Chip className={`tabular-nums font-semibold text-[11px] ${
                                e === 0 ? "bg-muted/10 text-muted"
                                  : e > 0 ? "bg-success/10 text-success"
                                  : "bg-danger/10 text-danger"
                              }`}>
                                {e > 0 ? "+" : ""}{formatMontant(e)} F
                              </Chip>
                            ) : (
                              <span className="text-[11px] text-muted">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <TextField value={commentaire} onChange={setCommentaire}>
                  <Label>Commentaire de fermeture (optionnel)</Label>
                  <TextArea
                    placeholder="Petit écart en espèces, RAS sur les autres méthodes"
                    rows={2}
                  />
                  <FieldError />
                </TextField>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button
              variant="primary"
              onPress={soumettreFermeture}
              isDisabled={!peutFermer || enCoursFermeture || recap.isLoading}
            >
              {enCoursFermeture
                ? "Fermeture..."
                : !peutFermer
                ? `${ticketsOpen.length} ticket(s) ouvert(s) bloquant`
                : "Fermer la caisse"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
