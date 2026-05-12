"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Switch, toast } from "@heroui/react";
import { useReceptionMutation } from "../queries/achat.query";
import { formatMontant } from "@/features/vente/utils/format";
import type { ICommande } from "../types/achat.type";

interface Props {
  ouvert: boolean;
  commande: ICommande | null;
  onFermer: () => void;
}

/**
 * Modale de reception : pour chaque ligne, le caissier saisit la quantite
 * recue dans ce versement. Pre-rempli avec le reste a recevoir
 * (quantiteCommandee - quantiteRecue) pour acceleration du cas total.
 *
 * Toggle "Mettre a jour le prix d'achat" : remplace pricePurchase de la
 * variante par le prix de la commande. Active par defaut sur SENT.
 */
export function ModalReception({ ouvert, commande, onFermer }: Props) {
  const reception = useReceptionMutation();
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [majPrix, setMajPrix] = useState(true);

  useEffect(() => {
    if (!ouvert || !commande) return;
    const init: Record<string, number> = {};
    for (const l of commande.lignes ?? []) {
      const reste = l.quantiteCommandee - l.quantiteRecue;
      init[l.id] = Math.max(0, reste);
    }
    setQuantites(init);
    setMajPrix(true);
  }, [ouvert, commande]);

  if (!commande) return null;

  const totalRecu = (commande.lignes ?? []).reduce(
    (s, l) => s + (quantites[l.id] ?? 0) * l.prixUnitaire,
    0,
  );
  const aReceptionner = Object.values(quantites).some((q) => q > 0);

  async function valider() {
    if (!commande) return;
    const lignesAvecQte = (commande.lignes ?? [])
      .filter((l) => (quantites[l.id] ?? 0) > 0)
      .map((l) => ({ ligneId: l.id, quantite: quantites[l.id]! }));
    if (lignesAvecQte.length === 0) {
      toast.warning("Aucune quantite a receptionner");
      return;
    }
    try {
      await reception.mutateAsync({
        id: commande.id,
        data: { lignes: lignesAvecQte, majPrixAchat: majPrix },
      });
      onFermer();
    } catch {
      /* toast affiche par la mutation */
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Reception {commande.numero}</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-xs text-muted">
              Saisissez la quantite reellement recue pour chaque ligne. Les mouvements de stock
              seront crees automatiquement a l&apos;emplacement de livraison.
            </p>
            <div className="space-y-2">
              {(commande.lignes ?? []).map((l) => {
                const reste = l.quantiteCommandee - l.quantiteRecue;
                return (
                  <div key={l.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.nomProduit}</p>
                      <p className="text-xs text-muted truncate">
                        {l.nomVariante ? `${l.nomVariante} · ` : ""}{l.sku}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Commandé {l.quantiteCommandee} · deja recu {l.quantiteRecue}
                        {reste > 0 && <span className="text-warning"> · reste {reste.toFixed(2)}</span>}
                      </p>
                    </div>
                    <input
                      type="number"
                      value={quantites[l.id] ?? 0}
                      onChange={(e) => setQuantites((q) => ({ ...q, [l.id]: Number(e.target.value) }))}
                      min={0}
                      max={reste}
                      step="0.001"
                      aria-label={`Quantite recue pour ${l.nomProduit}`}
                      className="w-24 h-9 px-2 text-sm text-right tabular-nums rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-surface-secondary rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">Mettre a jour le prix d&apos;achat</p>
                <p className="text-xs text-muted mt-0.5">
                  Le prix d&apos;achat des variantes recues sera remplace par celui de la commande.
                </p>
              </div>
              <Switch isSelected={majPrix} onChange={() => setMajPrix((v) => !v)} aria-label="Mettre a jour le prix d'achat">
                <Switch.Control><Switch.Thumb /></Switch.Control>
              </Switch>
            </div>

            <div className="pt-2 text-right text-sm font-semibold tabular-nums">
              Total receptionne : {formatMontant(totalRecu)} F
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>Annuler</Button>
            <Button
              variant="primary"
              onPress={valider}
              isDisabled={reception.isPending || !aReceptionner}
            >
              {reception.isPending ? "Enregistrement..." : "Valider la reception"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
