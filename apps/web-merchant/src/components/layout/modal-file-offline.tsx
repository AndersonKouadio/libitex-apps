"use client";

import { Modal, Button } from "@heroui/react";
import { Trash2, RotateCw, CloudOff } from "lucide-react";
import { useFileOffline, fileOffline } from "@/features/vente/utils/file-attente-offline";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

/**
 * Modale qui liste les ventes hors-ligne. Permet de :
 * - voir le detail (numero local, total, date, erreur eventuelle)
 * - relancer une tentative de sync (efface l'erreur, useSyncOffline reessaie)
 * - supprimer une entree en conflit definitif (ex: stock structurellement KO)
 */
export function ModalFileOffline({ ouvert, onFermer }: Props) {
  const file = useFileOffline();

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
                Aucune vente en attente
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {file.map((v) => (
                  <li key={v.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-foreground">{v.numeroLocal}</span>
                        <span className="text-xs text-muted">
                          {new Date(v.creeLe).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
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
            <Button variant="ghost" onPress={onFermer}>Fermer</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
