"use client";

import { Modal, Button, Chip } from "@heroui/react";
import { Trash2, RotateCw, CloudOff, AlertTriangle } from "lucide-react";
import { fileOffline, useFileOfflineTenant } from "@/features/vente/utils/file-attente-offline";
import { formatMontant } from "@/features/vente/utils/format";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useConfirmation } from "@/providers/confirmation-provider";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

/**
 * Modale qui liste les ventes hors-ligne du tenant courant. Permet de :
 * - voir le detail (numero local, total, date, nb tentatives, erreur)
 * - relancer une tentative de sync (efface l'erreur, useSyncOffline reessaie)
 * - supprimer une entree en conflit definitif
 * - vider tout (avec confirmation)
 *
 * Le filtre par tenant (useFileOfflineTenant) evite d'afficher les
 * ventes d'autres boutiques si le caissier a switche entre temps.
 */
export function ModalFileOffline({ ouvert, onFermer }: Props) {
  const { utilisateur } = useAuth();
  const file = useFileOfflineTenant(utilisateur?.tenantId);
  const confirmer = useConfirmation();

  async function viderTout() {
    if (file.length === 0) return;
    const ok = await confirmer({
      titre: `Vider la file (${file.length} vente${file.length > 1 ? "s" : ""}) ?`,
      description:
        "Toutes les ventes hors-ligne de cette boutique seront SUPPRIMEES sans synchronisation. "
        + "Action irreversible — utilisez-la uniquement si les ventes ne sont plus valides.",
      actionLibelle: "Tout vider",
    });
    if (!ok) return;
    // Retire une a une pour ne supprimer QUE les ventes du tenant courant
    // (preserve celles d'un autre tenant si presentes).
    for (const v of file) fileOffline.retirer(v.id);
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Ventes hors-ligne</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body>
            {file.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center text-muted text-sm">
                <CloudOff size={32} className="mb-3 opacity-40" />
                Aucune vente en attente pour cette boutique
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {file.map((v) => (
                  <li key={v.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-foreground">{v.numeroLocal}</span>
                        <span className="text-xs text-muted">
                          {new Date(v.creeLe).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {v.erreur && (
                          <Chip className="bg-danger/10 text-danger text-[10px] gap-1">
                            <AlertTriangle size={10} /> Conflit
                          </Chip>
                        )}
                        {(v.tentativesNb ?? 0) > 0 && !v.erreur && (
                          <Chip className="bg-warning/10 text-warning text-[10px]">
                            {v.tentativesNb} tentative{(v.tentativesNb ?? 0) > 1 ? "s" : ""}
                          </Chip>
                        )}
                      </div>
                      <div className="text-sm font-semibold tabular-nums mt-0.5">
                        {formatMontant(v.total)} F
                        <span className="text-xs font-normal text-muted ml-2">
                          · {v.payloadCreer.lignes.length} ligne{v.payloadCreer.lignes.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      {v.erreur && (
                        <p className="text-xs text-danger mt-1 break-words">
                          {v.erreur}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {v.erreur && (
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 min-w-0"
                          aria-label="Reessayer"
                          onPress={() => fileOffline.reessayer(v.id)}
                        >
                          <RotateCw size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 min-w-0 text-danger"
                        aria-label="Supprimer"
                        onPress={() => fileOffline.retirer(v.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Modal.Body>
          <Modal.Footer>
            {file.length > 0 && (
              <Button
                variant="ghost"
                className="text-danger gap-1.5"
                onPress={viderTout}
              >
                <Trash2 size={14} /> Tout vider
              </Button>
            )}
            <Button variant="ghost" onPress={onFermer}>Fermer</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
