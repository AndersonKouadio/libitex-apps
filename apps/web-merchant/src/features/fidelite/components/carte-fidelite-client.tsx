"use client";

import { useState } from "react";
import { Card, Button, Modal, TextField, Label, Input } from "@heroui/react";
import { Sparkles, Plus, Minus } from "lucide-react";
import {
  useConfigFideliteQuery, useSoldeFideliteQuery,
  useHistoriqueFideliteQuery, useAjusterPointsMutation,
} from "../queries/fidelite.query";
import { formatMontant } from "@/features/vente/utils/format";

const LIBELLE_TYPE: Record<string, string> = {
  EARN: "Gagne",
  REDEEM: "Utilise",
  ADJUST: "Ajustement",
};

interface Props {
  customerId: string;
}

/**
 * Carte fidelite affichee sur la fiche client. Cachee si le programme n'est
 * pas active sur la boutique (pas de cle dans le store).
 */
export function CarteFideliteClient({ customerId }: Props) {
  const { data: config } = useConfigFideliteQuery();
  const { data: solde } = useSoldeFideliteQuery(customerId);
  const { data: historique } = useHistoriqueFideliteQuery(customerId);
  const [ajustementOuvert, setAjustementOuvert] = useState(false);

  if (!config?.actif) return null;

  return (
    <>
      <Card className="mb-4">
        <Card.Content className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-xs text-muted">{config.nomProgramme}</p>
                <p className="text-2xl font-bold tabular-nums">
                  {solde?.solde ?? 0}
                  <span className="text-sm text-muted ml-1.5 font-normal">
                    point{(solde?.solde ?? 0) > 1 ? "s" : ""}
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Equivalent : {formatMontant(solde?.valeurEnFcfa ?? 0)} F
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-1.5 text-xs"
              onPress={() => setAjustementOuvert(true)}
            >
              <Plus size={12} /> Ajuster
            </Button>
          </div>

          {(historique?.length ?? 0) > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted mb-2">Dernieres transactions</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(historique ?? []).slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className={`text-xs font-medium ${
                        t.type === "EARN" ? "text-success" : t.type === "REDEEM" ? "text-danger" : "text-muted"
                      }`}>
                        {LIBELLE_TYPE[t.type]}
                      </span>
                      {t.ticketNumero && (
                        <span className="text-xs text-muted ml-1">{t.ticketNumero}</span>
                      )}
                      {t.note && (
                        <span className="text-xs text-muted ml-1">— {t.note}</span>
                      )}
                    </span>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      t.points > 0 ? "text-success" : "text-danger"
                    }`}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </span>
                    <span className="text-[10px] text-muted shrink-0">
                      {new Date(t.creeLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      <ModalAjustement
        ouvert={ajustementOuvert}
        customerId={customerId}
        onFermer={() => setAjustementOuvert(false)}
      />
    </>
  );
}

function ModalAjustement({ ouvert, customerId, onFermer }: {
  ouvert: boolean;
  customerId: string;
  onFermer: () => void;
}) {
  const ajuster = useAjusterPointsMutation(customerId);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");

  async function valider() {
    const n = Number(points);
    if (!Number.isFinite(n) || n === 0) return;
    await ajuster.mutateAsync({ points: n, note: note || undefined });
    setPoints("");
    setNote("");
    onFermer();
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Ajuster les points</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-xs text-muted">
              Saisissez un nombre positif pour crediter (cadeau, bonus), negatif pour debiter
              (correction, expiration manuelle).
            </p>
            <TextField value={points} onChange={setPoints}>
              <Label>Points (+/-)</Label>
              <Input type="number" placeholder="+50 ou -100" />
            </TextField>
            <TextField value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <Input placeholder="Raison de l'ajustement" />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>Annuler</Button>
            <Button variant="primary" onPress={valider} isDisabled={ajuster.isPending || !points}>
              {ajuster.isPending ? "..." : "Valider"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
