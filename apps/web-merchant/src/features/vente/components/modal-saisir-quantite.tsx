"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Label, InputGroup, TextField } from "@heroui/react";
import { Scale, Plus, Minus } from "lucide-react";
import { UniteMesure, UNITE_LABELS, formaterQuantite } from "@/features/unite/types/unite.type";
import { arrondirAuPas } from "@/features/unite/utils/unite";
import { formatMontant } from "../utils/format";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  onConfirmer: (quantite: number) => void;
  nomProduit: string;
  nomVariante: string;
  uniteVente: UniteMesure;
  pasMin: number | null;
  prixUnitaire: number;
  prixParUnite: boolean;
  /** Quantite courante dans le panier (pour edition). 0 = ajout neuf. */
  quantiteCourante?: number;
}

const RACCOURCIS_POIDS = [0.25, 0.5, 1, 2, 5];
const RACCOURCIS_LONGUEUR = [0.5, 1, 2, 5, 10];

/**
 * Modal de saisie de quantite pour les produits vendus au poids/volume/longueur.
 * Pre-remplit la valeur courante (en edition) ou le pasMin (en ajout).
 * Propose des raccourcis adaptes a l'unite et calcule le prix en direct.
 */
export function ModalSaisirQuantite({
  ouvert, onFermer, onConfirmer, nomProduit, nomVariante,
  uniteVente, pasMin, prixUnitaire, prixParUnite, quantiteCourante,
}: Props) {
  const pas = pasMin && pasMin > 0 ? pasMin : 0.001;
  const [valeur, setValeur] = useState("");

  useEffect(() => {
    if (!ouvert) return;
    setValeur(quantiteCourante && quantiteCourante > 0
      ? String(quantiteCourante)
      : String(pas));
  }, [ouvert, quantiteCourante, pas]);

  const quantite = arrondirAuPas(Number(valeur) || 0, pasMin);
  const total = prixUnitaire * quantite;
  const valide = quantite > 0;
  const raccourcis = uniteVente === UniteMesure.M || uniteVente === UniteMesure.CM
    ? RACCOURCIS_LONGUEUR
    : RACCOURCIS_POIDS;

  function ajusterDeUnPas(direction: 1 | -1) {
    setValeur((v) => String(arrondirAuPas(Math.max(0, (Number(v) || 0) + direction * pas), pasMin)));
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent"><Scale className="size-5" /></Modal.Icon>
            <Modal.Heading>Saisir la quantité</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground truncate">{nomProduit}</p>
              <p className="text-xs text-muted truncate mt-0.5">{nomVariante}</p>
            </div>

            <div className="flex items-stretch gap-2">
              <Button
                variant="secondary"
                className="w-14 h-14 shrink-0"
                onPress={() => ajusterDeUnPas(-1)}
                aria-label="Diminuer"
              >
                <Minus size={20} strokeWidth={2} />
              </Button>
              <TextField
                type="number"
                value={valeur}
                onChange={setValeur}
                aria-label="Quantité"
                className="flex-1"
              >
                <Label className="sr-only">Quantité</Label>
                <InputGroup className="h-14">
                  <InputGroup.Input
                    autoFocus
                    min="0"
                    step={String(pas)}
                    className="text-center text-2xl font-bold tabular-nums"
                  />
                  <InputGroup.Suffix>
                    <span className="text-sm text-muted">{UNITE_LABELS[uniteVente]}</span>
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>
              <Button
                variant="secondary"
                className="w-14 h-14 shrink-0"
                onPress={() => ajusterDeUnPas(1)}
                aria-label="Augmenter"
              >
                <Plus size={20} strokeWidth={2} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {raccourcis.map((q) => (
                <Button
                  key={q}
                  variant="ghost"
                  className="h-11 text-sm px-4 border border-border"
                  onPress={() => setValeur(String(q))}
                >
                  {q} {UNITE_LABELS[uniteVente]}
                </Button>
              ))}
            </div>

            <div className="rounded-xl bg-surface-secondary p-3 flex items-center justify-between">
              <div className="text-xs text-muted">
                {formatMontant(prixUnitaire)} F{prixParUnite ? ` / ${UNITE_LABELS[uniteVente]}` : ""}
                {prixParUnite && <> × {formaterQuantite(quantite, uniteVente)}</>}
              </div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                {formatMontant(total)}
                <span className="text-xs font-normal text-muted ml-1">F</span>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={() => onConfirmer(quantite)} isDisabled={!valide}>
              {quantiteCourante ? "Mettre à jour" : "Ajouter au panier"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
