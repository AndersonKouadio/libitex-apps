"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Button } from "@heroui/react";
import { UtensilsCrossed, Plus, Minus } from "lucide-react";
import type { ISupplement } from "@/features/supplement/types/supplement.type";
import { LABELS_CATEGORIE_SUPPLEMENT } from "@/features/supplement/types/supplement.type";
import { useSupplementListQuery } from "@/features/supplement/queries/supplement.query";
import { formatMontant } from "../utils/format";
import type { SupplementChoisi } from "../hooks/usePanier";

interface Props {
  ouvert: boolean;
  nomProduit: string;
  prixBase: number;
  /** Suppléments deja sur la ligne (mode edition) — pre-remplit la modale. */
  supplementsCourants?: SupplementChoisi[];
  onConfirmer: (supplements: SupplementChoisi[]) => void;
  onFermer: () => void;
}

export function ModalSupplements({
  ouvert, nomProduit, prixBase, supplementsCourants, onConfirmer, onFermer,
}: Props) {
  const { data: tous } = useSupplementListQuery();
  // Map supplementId -> quantite choisie (0 = non selectionne)
  const [quantites, setQuantites] = useState<Record<string, number>>({});

  useEffect(() => {
    if (ouvert) {
      const initial: Record<string, number> = {};
      for (const s of supplementsCourants ?? []) initial[s.supplementId] = s.quantite;
      setQuantites(initial);
    }
  }, [ouvert, supplementsCourants]);

  const supplementsDispos = useMemo(
    () => (tous ?? []).filter((s) => s.actif),
    [tous],
  );

  // Regroupement par categorie pour l'UI.
  const parCategorie = useMemo(() => {
    const grouped: Record<string, ISupplement[]> = {};
    for (const s of supplementsDispos) {
      const k = s.categorie;
      if (!grouped[k]) grouped[k] = [];
      grouped[k]!.push(s);
    }
    return grouped;
  }, [supplementsDispos]);

  function setQte(id: string, q: number) {
    setQuantites((prev) => {
      const next = { ...prev };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  const totalSupplements = supplementsDispos.reduce(
    (s, sup) => s + sup.prix * (quantites[sup.id] ?? 0),
    0,
  );
  const total = prixBase + totalSupplements;

  function valider() {
    const choisis: SupplementChoisi[] = supplementsDispos
      .filter((s) => (quantites[s.id] ?? 0) > 0)
      .map((s) => ({
        supplementId: s.id,
        nom: s.nom,
        prixUnitaire: s.prix,
        quantite: quantites[s.id]!,
      }));
    onConfirmer(choisis);
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog className="!max-w-2xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <UtensilsCrossed className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Personnaliser : {nomProduit}</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {supplementsDispos.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                Aucun supplément actif. Créez-en dans le menu Suppléments.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted">
                  Choisissez les extras à ajouter (sauces, accompagnements, boissons…).
                </p>

                {Object.entries(parCategorie).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                      {LABELS_CATEGORIE_SUPPLEMENT[cat as keyof typeof LABELS_CATEGORIE_SUPPLEMENT] ?? cat}
                    </p>
                    <ul className="space-y-1.5">
                      {items.map((s) => {
                        const qte = quantites[s.id] ?? 0;
                        return (
                          <li
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                              qte > 0
                                ? "border-accent/40 bg-accent/5"
                                : "border-border bg-surface"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{s.nom}</p>
                              <p className="text-xs text-muted">
                                +{formatMontant(s.prix)} F par unité
                              </p>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-secondary rounded-lg overflow-hidden">
                              <Button
                                variant="ghost"
                                className="w-8 h-8 min-w-0 p-0 text-muted hover:text-foreground rounded-none"
                                onPress={() => setQte(s.id, Math.max(0, qte - 1))}
                                isDisabled={qte === 0}
                                aria-label={`Diminuer ${s.nom}`}
                              >
                                <Minus size={14} />
                              </Button>
                              <span className="w-8 text-center text-sm font-semibold tabular-nums">
                                {qte}
                              </span>
                              <Button
                                variant="ghost"
                                className="w-8 h-8 min-w-0 p-0 text-muted hover:text-foreground rounded-none"
                                onPress={() => setQte(s.id, qte + 1)}
                                aria-label={`Augmenter ${s.nom}`}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </>
            )}

            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex justify-between text-sm text-muted">
                <span>Prix de base</span>
                <span className="tabular-nums">{formatMontant(prixBase)} F</span>
              </div>
              {totalSupplements > 0 && (
                <div className="flex justify-between text-sm text-muted">
                  <span>Suppléments</span>
                  <span className="tabular-nums">+ {formatMontant(totalSupplements)} F</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-foreground">
                <span>Total</span>
                <span className="tabular-nums">{formatMontant(total)} F</span>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={valider}>
              Confirmer
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
