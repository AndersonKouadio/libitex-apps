"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Modal, Button, TextField, Label, Input, TextArea, FieldError,
} from "@heroui/react";
import { Scale, AlertCircle, ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "../queries/emplacement-list.query";
import { useStockEmplacementQuery } from "../queries/stock-emplacement.query";
import { useAjustementStockMutation } from "../queries/stock-ajustement.mutation";
import { ajustementStockSchema, type AjustementStockDTO } from "../schemas/stock.schema";
import { SelectVariante } from "./select-variante";
import { SelectEmplacement } from "./select-emplacement";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  emplacementParDefautId?: string;
}

export function ModalAjustementStock({ ouvert, onFermer, emplacementParDefautId }: Props) {
  const { data: produitsData } = useProduitListQuery(1);
  const { data: emplacements } = useEmplacementListQuery();
  const mutation = useAjustementStockMutation();

  const [varianteId, setVarianteId] = useState("");
  const [emplacementId, setEmplacementId] = useState(emplacementParDefautId ?? "");
  const [quantiteReelle, setQuantiteReelle] = useState("");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");

  // Suivre la valeur d'emplacement par defaut quand on ouvre/ferme la modale
  useEffect(() => {
    if (ouvert && emplacementParDefautId) setEmplacementId(emplacementParDefautId);
  }, [ouvert, emplacementParDefautId]);

  const produits = produitsData?.data ?? [];
  const emps = emplacements ?? [];
  const { data: stockEmplacement } = useStockEmplacementQuery(emplacementId);

  const stockActuel = useMemo(() => {
    if (!varianteId || !stockEmplacement) return null;
    return stockEmplacement.find((s) => s.varianteId === varianteId)?.quantite ?? 0;
  }, [varianteId, stockEmplacement]);

  const reelle = quantiteReelle === "" ? null : Number(quantiteReelle);
  const delta = stockActuel != null && reelle != null ? reelle - stockActuel : null;
  const sens = delta == null ? null : delta > 0 ? "ajout" : delta < 0 ? "retrait" : "egal";

  function reinitialiser() {
    setVarianteId("");
    setEmplacementId(emplacementParDefautId ?? "");
    setQuantiteReelle("");
    setNote("");
    setErreur("");
  }

  async function soumettre() {
    setErreur("");
    if (delta === null) {
      setErreur("Sélectionnez un produit, un emplacement et saisissez la quantité réelle.");
      return;
    }
    const donnees: AjustementStockDTO = {
      varianteId, emplacementId, quantite: delta, note: note.trim(),
    };
    const validation = ajustementStockSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'ajustement");
    }
  }

  const IconeSens = sens === "ajout" ? ArrowUpRight : sens === "retrait" ? ArrowDownRight : Equal;
  const couleurSens = sens === "ajout" ? "text-success" : sens === "retrait" ? "text-danger" : "text-muted";

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <Scale className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Ajustement d'inventaire</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <SelectEmplacement emplacements={emps} emplacementId={emplacementId} onChange={setEmplacementId} />
            <SelectVariante produits={produits} varianteId={varianteId} onChange={setVarianteId} />

            {stockActuel != null && (
              <div className="rounded-lg bg-surface-secondary/50 px-3 py-2.5 text-sm flex items-center justify-between">
                <span className="text-muted">Stock théorique actuel</span>
                <span className="font-semibold tabular-nums">{stockActuel}</span>
              </div>
            )}

            <TextField isRequired type="number" value={quantiteReelle} onChange={setQuantiteReelle}>
              <Label>Quantité réelle constatée</Label>
              <Input placeholder="Comptage physique" min="0" />
              <FieldError />
            </TextField>

            {delta != null && delta !== 0 && (
              <div className={`rounded-lg border px-3 py-2.5 text-sm flex items-center gap-2 ${
                sens === "ajout" ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
              }`}>
                <IconeSens size={16} className={couleurSens} />
                <span className="text-foreground">
                  Écart : <span className={`font-semibold tabular-nums ${couleurSens}`}>{delta > 0 ? `+${delta}` : delta}</span>
                </span>
              </div>
            )}

            <TextField isRequired value={note} onChange={setNote}>
              <Label>Justification</Label>
              <TextArea
                placeholder="Casse, perte, vol, erreur de saisie, écart constaté à l'inventaire..."
                rows={2}
              />
              <FieldError />
            </TextField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button
              variant="primary"
              onPress={soumettre}
              isDisabled={mutation.isPending || delta === 0 || delta == null}
            >
              {mutation.isPending ? "Enregistrement..." : "Confirmer l'ajustement"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
