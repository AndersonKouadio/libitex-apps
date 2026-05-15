"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Switch, NumberField, Chip, toast } from "@heroui/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useReceptionMutation } from "../queries/achat.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { formatMontant } from "@/features/vente/utils/format";
import { preview } from "../utils/landed-cost";
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

  // Phase A.4 : recupere le stock courant pour preview de l'impact CUMP
  const { data: stockEmplacement } = useStockEmplacementQuery(commande?.emplacementId);
  const stockParVariante = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stockEmplacement ?? []) {
      map.set(s.varianteId, Number(s.quantite ?? 0));
    }
    return map;
  }, [stockEmplacement]);

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

  // Fix I2 : detecte les lignes ou la quantite saisie depasse le reste.
  // Permet de bloquer le bouton "Valider" et d'afficher un indicateur par ligne.
  const lignesEnDepassement = (commande.lignes ?? [])
    .filter((l) => {
      const reste = l.quantiteCommandee - l.quantiteRecue;
      return (quantites[l.id] ?? 0) > reste + 0.0001;
    })
    .map((l) => l.id);

  // Fix I12 : detecte le cas "toutes les lignes ont deja ete receptionnees"
  const tout_recu = (commande.lignes ?? []).every(
    (l) => l.quantiteRecue >= l.quantiteCommandee - 0.0001,
  );

  // Phase A.4 : preview de l'impact sur le CUMP par ligne, avec frais alloues
  const apercuParLigne = useMemo(() => {
    if (!commande) return new Map<string, ReturnType<typeof preview>[number]>();
    const lignesPreview = (commande.lignes ?? []).map((l) => ({
      ligneId: l.id,
      prixUnitaire: l.prixUnitaire,
      quantiteRecue: quantites[l.id] ?? 0,
      cumpActuel: l.cumpActuel ?? 0,
      stockAvant: stockParVariante.get(l.varianteId) ?? 0,
    }));
    const resultats = preview(
      lignesPreview,
      commande.fraisTotal ?? 0,
      commande.methodeAllocation ?? "QUANTITY",
    );
    const map = new Map<string, (typeof resultats)[number]>();
    for (const r of resultats) map.set(r.ligneId, r);
    return map;
  }, [commande, quantites, stockParVariante]);

  async function valider() {
    if (!commande) return;
    if (lignesEnDepassement.length > 0) {
      toast.danger("Une ligne depasse le reste a recevoir — corrigez avant de valider");
      return;
    }
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

  // Fix I4 : NumberField HeroUI v3 garantit deja une valeur numerique
  // valide via son onChange (jamais NaN). Pas besoin de parser manuellement.

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
            {tout_recu && (
              <p className="text-xs text-success bg-success/5 border border-success/20 rounded-md px-3 py-2">
                Toutes les lignes ont deja ete entierement receptionnees.
              </p>
            )}
            <div className="space-y-2">
              {(commande.lignes ?? []).map((l) => {
                const reste = l.quantiteCommandee - l.quantiteRecue;
                const enDepassement = lignesEnDepassement.includes(l.id);
                const apercu = apercuParLigne.get(l.id);
                const qteSaisie = quantites[l.id] ?? 0;
                return (
                  <div
                    key={l.id}
                    className={`p-2 border rounded-lg ${
                      enDepassement ? "border-danger/60 bg-danger/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.nomProduit}</p>
                        <p className="text-xs text-muted truncate">
                          {l.nomVariante ? `${l.nomVariante} · ` : ""}{l.sku}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          Commandé {l.quantiteCommandee} · deja recu {l.quantiteRecue}
                          {reste > 0 && <span className="text-warning"> · reste {reste.toFixed(2)}</span>}
                        </p>
                        {enDepassement && (
                          <p className="text-xs text-danger mt-0.5">
                            La quantite saisie depasse le reste a recevoir
                          </p>
                        )}
                      </div>
                      <NumberField
                        value={Number.isFinite(quantites[l.id]) ? (quantites[l.id] ?? 0) : 0}
                        onChange={(v) => setQuantites((q) => ({ ...q, [l.id]: Number.isFinite(v) ? v : 0 }))}
                        minValue={0}
                        maxValue={reste}
                        step={0.001}
                        isInvalid={enDepassement}
                        aria-label={`Quantite recue pour ${l.nomProduit}`}
                        className="w-28"
                      >
                        <NumberField.Group>
                          <NumberField.Input className="text-right tabular-nums" />
                        </NumberField.Group>
                      </NumberField>
                    </div>

                    {/* Phase A.4 : preview de l'impact CUMP */}
                    {qteSaisie > 0 && apercu && (
                      <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted">CUMP actuel</p>
                          <p className="tabular-nums font-medium">
                            {l.cumpActuel > 0 ? `${formatMontant(l.cumpActuel)} F` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted">Cout debarque</p>
                          <p className="tabular-nums font-medium">
                            {formatMontant(apercu.landedUnitCost)} F
                          </p>
                        </div>
                        <div>
                          <p className="text-muted">Nouveau CUMP</p>
                          <div className="flex items-center gap-1 tabular-nums font-semibold">
                            {formatMontant(apercu.nouveauCump)} F
                            {apercu.variationPct !== null && apercu.variationPct !== 0 && (
                              <Chip
                                variant="soft"
                                size="sm"
                                className={`text-[10px] gap-0.5 ${
                                  apercu.variationPct > 0
                                    ? "bg-warning/10 text-warning"
                                    : "bg-success/10 text-success"
                                }`}
                              >
                                {apercu.variationPct > 0 ? (
                                  <TrendingUp size={10} />
                                ) : (
                                  <TrendingDown size={10} />
                                )}
                                {apercu.variationPct > 0 ? "+" : ""}
                                {apercu.variationPct}%
                              </Chip>
                            )}
                            {apercu.variationPct === 0 && (
                              <Chip variant="soft" size="sm" className="text-[10px] gap-0.5 bg-muted/10 text-muted">
                                <Minus size={10} />
                                stable
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
              isDisabled={reception.isPending || !aReceptionner || lignesEnDepassement.length > 0}
            >
              {reception.isPending ? "Enregistrement..." : "Valider la reception"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
