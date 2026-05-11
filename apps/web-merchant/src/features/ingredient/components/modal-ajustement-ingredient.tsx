"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal, Button, TextField, Label, Input, TextArea, Select, ListBox,
} from "@heroui/react";
import { Scale, AlertCircle, ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { ajustementIngredientSchema, type AjustementIngredientDTO } from "../schemas/ingredient.schema";
import { useAjusterIngredientMutation } from "../queries/ingredient-mutations";
import {
  useIngredientListQuery, useStockIngredientsQuery,
} from "../queries/ingredient-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  emplacementParDefautId?: string;
}

/**
 * Saisit la quantite reelle constatee et envoie au backend l'ecart
 * algebrique (positif = ajout, negatif = retrait). L'unite est celle
 * de la fiche ingredient (immuable une fois saisie).
 */
export function ModalAjustementIngredient({ ouvert, onFermer, emplacementParDefautId }: Props) {
  const mutation = useAjusterIngredientMutation();
  const { data: ingredients } = useIngredientListQuery();
  const { data: emplacements } = useEmplacementListQuery();

  const [ingredientId, setIngredientId] = useState("");
  const [emplacementId, setEmplacementId] = useState(emplacementParDefautId ?? "");
  const [quantiteReelle, setQuantiteReelle] = useState("");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");

  const { data: stockIng } = useStockIngredientsQuery(emplacementId || undefined);

  useEffect(() => {
    if (ouvert && emplacementParDefautId) setEmplacementId(emplacementParDefautId);
  }, [ouvert, emplacementParDefautId]);

  const ingredient = useMemo(() => ingredients?.find((i) => i.id === ingredientId), [ingredients, ingredientId]);
  const stockActuel = useMemo(() => {
    if (!ingredientId || !stockIng) return null;
    return stockIng.find((s) => s.ingredientId === ingredientId)?.quantite ?? 0;
  }, [ingredientId, stockIng]);

  const reelle = quantiteReelle === "" ? null : Number(quantiteReelle);
  const delta = stockActuel != null && reelle != null ? reelle - stockActuel : null;
  const sens = delta == null ? null : delta > 0 ? "ajout" : delta < 0 ? "retrait" : "egal";

  function reinitialiser() {
    setIngredientId("");
    setEmplacementId(emplacementParDefautId ?? "");
    setQuantiteReelle("");
    setNote("");
    setErreur("");
  }

  async function soumettre() {
    setErreur("");
    if (reelle == null) {
      setErreur("Saisissez la quantité réelle constatée.");
      return;
    }
    const donnees: AjustementIngredientDTO = {
      ingredientId, emplacementId, quantiteReelle: reelle, note: note.trim() || undefined,
    };
    const validation = ajustementIngredientSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'ajustement");
    }
  }

  const IconeSens = sens === "ajout" ? ArrowUpRight : sens === "retrait" ? ArrowDownRight : Equal;
  const couleurSens = sens === "ajout" ? "text-success" : sens === "retrait" ? "text-danger" : "text-muted";
  const unite = ingredient ? UNITE_LABELS[ingredient.unite] : "";

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <Scale className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Ajustement d'inventaire — Ingrédient</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <Select
              isRequired
              selectedKey={emplacementId || (emplacements?.[0]?.id ?? "")}
              onSelectionChange={(k) => setEmplacementId(String(k))}
            >
              <Label>Emplacement de destination</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(emplacements ?? []).map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              isRequired
              selectedKey={ingredientId}
              onSelectionChange={(k) => setIngredientId(String(k))}
            >
              <Label>Ingrédient à ajuster</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(ingredients ?? []).map((i) => (
                    <ListBox.Item key={i.id} id={i.id} textValue={i.nom}>
                      {i.nom}
                      <span className="text-xs text-muted ml-1">(en {UNITE_LABELS[i.unite]})</span>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {stockActuel != null && (
              <div className="rounded-lg bg-surface-secondary/50 px-3 py-2.5 text-sm flex items-center justify-between">
                <span className="text-muted">Stock théorique actuel</span>
                <span className="font-semibold tabular-nums">
                  {stockActuel.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {unite}
                </span>
              </div>
            )}

            <TextField isRequired type="number" value={quantiteReelle} onChange={setQuantiteReelle}>
              <Label>Quantité réelle constatée {unite && `(${unite})`}</Label>
              <Input placeholder="Comptage physique" min="0" step="0.001" />
            </TextField>

            {delta != null && delta !== 0 && (
              <div className={`rounded-lg border px-3 py-2.5 text-sm flex items-center gap-2 ${
                sens === "ajout" ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
              }`}>
                <IconeSens size={16} className={couleurSens} />
                <span className="text-foreground">
                  Écart : <span className={`font-semibold tabular-nums ${couleurSens}`}>
                    {delta > 0 ? `+${delta.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}`
                      : delta.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {unite}
                  </span>
                </span>
              </div>
            )}

            <TextField value={note} onChange={setNote}>
              <Label>Justification</Label>
              <TextArea
                placeholder="Casse, perte, vol, erreur de saisie, écart constaté à l'inventaire..."
                rows={2}
              />
            </TextField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button
              variant="primary"
              onPress={soumettre}
              isDisabled={mutation.isPending || delta === 0 || delta == null || !ingredientId || !emplacementId}
            >
              {mutation.isPending ? "Enregistrement..." : "Confirmer l'ajustement"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
