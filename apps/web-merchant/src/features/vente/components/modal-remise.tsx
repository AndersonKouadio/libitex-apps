"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, TextArea, Select, ListBox,
} from "@heroui/react";
import { Tag, Percent, Banknote } from "lucide-react";
import { formatMontant } from "../utils/format";
import { calculerMontantRemise, type Remise } from "../hooks/usePanier";

interface Props {
  ouvert: boolean;
  /** Si true, on edite — sinon on cree. Affecte le titre + le bouton retirer. */
  remiseCourante?: Remise | null;
  /** Sous-total sur lequel la remise s'applique (ligne ou ticket complet). */
  sousTotal: number;
  /** Libelle de cible pour le titre : "le ticket", "Pawa", "le menu burger"... */
  cible: string;
  onConfirmer: (remise: { type: "POURCENTAGE" | "MONTANT"; valeur: number; raison?: string }) => void;
  onRetirer?: () => void;
  onFermer: () => void;
}

const RAISONS_PRESET = [
  "Geste commercial",
  "Erreur de prix affiché",
  "Cadeau client",
  "Promotion en cours",
  "Client fidèle",
  "Réclamation qualité",
  "Autre",
] as const;

const QUICK_POURCENTAGES = [5, 10, 15, 20];
const QUICK_MONTANTS = [500, 1000, 2000];

export function ModalRemise({
  ouvert, remiseCourante, sousTotal, cible,
  onConfirmer, onRetirer, onFermer,
}: Props) {
  const [type, setType] = useState<"POURCENTAGE" | "MONTANT">("POURCENTAGE");
  const [valeur, setValeur] = useState<number>(0);
  const [raisonSelectionnee, setRaisonSelectionnee] = useState<string>("Geste commercial");
  const [raisonLibre, setRaisonLibre] = useState<string>("");

  // Re-init a l'ouverture : pre-remplit si on edite, vide sinon
  useEffect(() => {
    if (!ouvert) return;
    if (remiseCourante) {
      setType(remiseCourante.type);
      setValeur(remiseCourante.valeurOriginale);
      const raisonExistante = remiseCourante.raison ?? "";
      const presetMatch = (RAISONS_PRESET as readonly string[]).includes(raisonExistante);
      setRaisonSelectionnee(presetMatch ? raisonExistante : "Autre");
      setRaisonLibre(presetMatch ? "" : raisonExistante);
    } else {
      setType("POURCENTAGE");
      setValeur(0);
      setRaisonSelectionnee("Geste commercial");
      setRaisonLibre("");
    }
  }, [ouvert, remiseCourante]);

  const montant = useMemo(
    () => calculerMontantRemise(type, valeur, sousTotal),
    [type, valeur, sousTotal],
  );
  const totalApres = Math.max(0, sousTotal - montant);

  const raisonFinale = raisonSelectionnee === "Autre"
    ? (raisonLibre.trim() || undefined)
    : raisonSelectionnee;

  function appliquer() {
    if (valeur <= 0) return;
    onConfirmer({ type, valeur, raison: raisonFinale });
    onFermer();
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <Tag className="size-5" />
            </Modal.Icon>
            <Modal.Heading>
              {remiseCourante ? "Modifier la remise" : "Appliquer une remise"}
            </Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            <p className="text-xs text-muted">
              Sur <span className="text-foreground font-medium">{cible}</span> ·
              Sous-total <span className="font-semibold tabular-nums text-foreground">{formatMontant(sousTotal)} F</span>
            </p>

            {/* Toggle type */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={type === "POURCENTAGE" ? "primary" : "secondary"}
                className="gap-2"
                onPress={() => setType("POURCENTAGE")}
              >
                <Percent size={14} /> Pourcentage
              </Button>
              <Button
                variant={type === "MONTANT" ? "primary" : "secondary"}
                className="gap-2"
                onPress={() => setType("MONTANT")}
              >
                <Banknote size={14} /> Montant fixe
              </Button>
            </div>

            {/* Valeur */}
            <TextField
              isRequired
              type="number"
              value={String(valeur || "")}
              onChange={(v) => setValeur(Number(v) || 0)}
            >
              <Label>{type === "POURCENTAGE" ? "Pourcentage de remise (%)" : "Montant a deduire (F CFA)"}</Label>
              <Input
                placeholder={type === "POURCENTAGE" ? "10" : "1000"}
                min="0"
                max={type === "POURCENTAGE" ? "100" : undefined}
                autoFocus
              />
              <FieldError />
            </TextField>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(type === "POURCENTAGE" ? QUICK_POURCENTAGES : QUICK_MONTANTS).map((v) => (
                <Button
                  key={v}
                  variant="ghost"
                  className="h-8 px-2.5 text-xs border border-border"
                  onPress={() => setValeur(v)}
                >
                  {type === "POURCENTAGE" ? `${v}%` : `${formatMontant(v)} F`}
                </Button>
              ))}
            </div>

            {/* Raison */}
            <Select
              selectedKey={raisonSelectionnee}
              onSelectionChange={(k) => setRaisonSelectionnee(String(k))}
              aria-label="Raison de la remise"
            >
              <Label>Raison (optionnelle)</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {RAISONS_PRESET.map((r) => (
                    <ListBox.Item key={r} id={r} textValue={r}>{r}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {raisonSelectionnee === "Autre" && (
              <TextField value={raisonLibre} onChange={setRaisonLibre}>
                <Label>Préciser la raison</Label>
                <TextArea placeholder="Decrire le motif de la remise" rows={2} />
                <FieldError />
              </TextField>
            )}

            {/* Apercu */}
            <div className="rounded-lg border border-border bg-muted/5 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted text-xs">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatMontant(sousTotal)} F</span>
              </div>
              <div className="flex justify-between text-warning text-xs">
                <span>
                  Remise
                  {type === "POURCENTAGE" && valeur > 0 && (
                    <span className="text-muted ml-1">({valeur}%)</span>
                  )}
                </span>
                <span className="tabular-nums">- {formatMontant(montant)} F</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-border">
                <span>Total apres remise</span>
                <span className="tabular-nums text-accent">{formatMontant(totalApres)} F</span>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            {remiseCourante && onRetirer && (
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger/5 mr-auto"
                onPress={() => { onRetirer(); onFermer(); }}
              >
                Retirer la remise
              </Button>
            )}
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={appliquer} isDisabled={valeur <= 0}>
              {remiseCourante ? "Mettre a jour" : "Appliquer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
