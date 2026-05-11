"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal, Button, TextField, Label, Input, TextArea, Select, ListBox,
} from "@heroui/react";
import { ArrowRightLeft, AlertCircle } from "lucide-react";
import {
  transfertIngredientSchema, type TransfertIngredientDTO,
} from "../schemas/ingredient.schema";
import { useTransfererIngredientMutation } from "../queries/ingredient-mutations";
import {
  useIngredientListQuery, useStockIngredientsQuery,
} from "../queries/ingredient-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { UNITE_LABELS } from "@/features/unite/types/unite.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  emplacementSourceParDefaut?: string;
}

/**
 * Transferer un ingredient d'un emplacement vers un autre. La quantite
 * est saisie dans l'unite de base de l'ingredient (la fiche en DB). Le
 * stock source est affiche en temps reel pour eviter les sur-transferts.
 */
export function ModalTransfertIngredient({
  ouvert, onFermer, emplacementSourceParDefaut,
}: Props) {
  const mutation = useTransfererIngredientMutation();
  const { data: ingredients } = useIngredientListQuery();
  const { data: emplacements } = useEmplacementListQuery();

  const [ingredientId, setIngredientId] = useState("");
  const [depuisId, setDepuisId] = useState(emplacementSourceParDefaut ?? "");
  const [versId, setVersId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");

  const { data: stockSource } = useStockIngredientsQuery(depuisId || undefined);

  useEffect(() => {
    if (ouvert && emplacementSourceParDefaut) setDepuisId(emplacementSourceParDefaut);
  }, [ouvert, emplacementSourceParDefaut]);

  const ingredient = useMemo(
    () => ingredients?.find((i) => i.id === ingredientId),
    [ingredients, ingredientId],
  );
  const stockDispo = useMemo(() => {
    if (!ingredientId || !stockSource) return null;
    return stockSource.find((s) => s.ingredientId === ingredientId)?.quantite ?? 0;
  }, [ingredientId, stockSource]);

  const empsHorsSource = (emplacements ?? []).filter((e) => e.id !== depuisId);
  const unite = ingredient ? UNITE_LABELS[ingredient.unite] : "";
  const qtNum = quantite === "" ? null : Number(quantite);
  const trop = stockDispo != null && qtNum != null && qtNum > stockDispo;

  function reinitialiser() {
    setIngredientId("");
    setDepuisId(emplacementSourceParDefaut ?? "");
    setVersId("");
    setQuantite("");
    setNote("");
    setErreur("");
  }

  async function soumettre() {
    setErreur("");
    const data: TransfertIngredientDTO = {
      ingredientId,
      depuisEmplacementId: depuisId,
      versEmplacementId: versId,
      quantite: Number(quantite) || 0,
      note: note.trim() || undefined,
    };
    const validation = transfertIngredientSchema.safeParse(data);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    if (trop) {
      setErreur(`Stock insuffisant à la source (${stockDispo} ${unite}).`);
      return;
    }
    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors du transfert");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <ArrowRightLeft className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Transfert d'ingrédient</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Select
                isRequired selectedKey={depuisId}
                onSelectionChange={(k) => setDepuisId(String(k))}
              >
                <Label>Depuis</Label>
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
                isRequired selectedKey={versId}
                onSelectionChange={(k) => setVersId(String(k))}
                isDisabled={!depuisId}
              >
                <Label>Vers</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {empsHorsSource.map((e) => (
                      <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <Select
              isRequired selectedKey={ingredientId}
              onSelectionChange={(k) => setIngredientId(String(k))}
            >
              <Label>Ingrédient à transférer</Label>
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

            {stockDispo != null && (
              <div className="rounded-lg bg-surface-secondary/50 px-3 py-2.5 text-sm flex items-center justify-between">
                <span className="text-muted">Stock disponible à la source</span>
                <span className="font-semibold tabular-nums">
                  {stockDispo.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {unite}
                </span>
              </div>
            )}

            <TextField isRequired type="number" value={quantite} onChange={setQuantite}>
              <Label>Quantité à transférer {unite && `(${unite})`}</Label>
              <Input placeholder="5" min="0" step="0.001" />
            </TextField>

            {trop && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
                Quantité supérieure au stock disponible.
              </div>
            )}

            <TextField value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <TextArea placeholder="Raison du transfert..." rows={2} />
            </TextField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button
              variant="primary"
              onPress={soumettre}
              isDisabled={
                mutation.isPending || !ingredientId || !depuisId || !versId || !qtNum || trop
              }
            >
              {mutation.isPending ? "Transfert..." : "Confirmer le transfert"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
