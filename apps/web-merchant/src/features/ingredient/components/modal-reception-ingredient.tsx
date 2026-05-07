"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, Select, ListBox, TextArea } from "@heroui/react";
import { PackagePlus } from "lucide-react";
import { entreeIngredientSchema, type EntreeIngredientDTO } from "../schemas/ingredient.schema";
import { useReceptionnerIngredientMutation } from "../queries/ingredient-mutations";
import { useIngredientListQuery } from "../queries/ingredient-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { UNITES_ORDONNEES, UNITE_LABELS, type UniteIngredient } from "../types/ingredient.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export function ModalReceptionIngredient({ ouvert, onFermer }: Props) {
  const mutation = useReceptionnerIngredientMutation();
  const { data: ingredients } = useIngredientListQuery();
  const { data: emplacements } = useEmplacementListQuery();

  const [ingredientId, setIngredientId] = useState("");
  const [emplacementId, setEmplacementId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState<UniteIngredient | "">("");
  const [coutTotal, setCoutTotal] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");

  const ingredient = ingredients?.find((i) => i.id === ingredientId);
  const uniteEffective = unite || ingredient?.unite || "KG";

  async function soumettre() {
    setErreur("");
    const data: EntreeIngredientDTO = {
      ingredientId,
      emplacementId: emplacementId || emplacements?.[0]?.id || "",
      quantite: Number(quantite) || 0,
      unite: (unite || ingredient?.unite) as UniteIngredient | undefined,
      coutTotal: coutTotal ? Number(coutTotal) : undefined,
      reference: reference || undefined,
      note: note || undefined,
    };
    const validation = entreeIngredientSchema.safeParse(data);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync(validation.data);
      setIngredientId(""); setEmplacementId(""); setQuantite(""); setUnite("");
      setCoutTotal(""); setReference(""); setNote(""); setErreur("");
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-success/10 text-success"><PackagePlus className="size-5" /></Modal.Icon>
            <Modal.Heading>Réception d'ingrédients</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>}

            <Select
              isRequired
              selectedKey={ingredientId}
              onSelectionChange={(k) => setIngredientId(String(k))}
            >
              <Label>Ingrédient</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(ingredients ?? []).map((i) => (
                    <ListBox.Item key={i.id} id={i.id} textValue={i.nom}>
                      {i.nom} <span className="text-xs text-muted ml-1">(par {UNITE_LABELS[i.unite]})</span>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              isRequired
              selectedKey={emplacementId || emplacements?.[0]?.id || ""}
              onSelectionChange={(k) => setEmplacementId(String(k))}
            >
              <Label>Emplacement de stockage</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(emplacements ?? []).map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <TextField isRequired type="number" value={quantite} onChange={setQuantite}>
                <Label>Quantité reçue</Label>
                <Input placeholder="25" min="0" step="0.001" />
              </TextField>
              <Select
                selectedKey={uniteEffective}
                onSelectionChange={(k) => setUnite(String(k) as UniteIngredient)}
              >
                <Label>Unité</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {UNITES_ORDONNEES.map((u) => (
                      <ListBox.Item key={u} id={u} textValue={UNITE_LABELS[u]}>{UNITE_LABELS[u]}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <TextField type="number" value={coutTotal} onChange={setCoutTotal}>
              <Label>Coût total de la réception (F CFA, optionnel)</Label>
              <Input placeholder="21 000" min="0" />
            </TextField>

            <TextField value={reference} onChange={setReference}>
              <Label>Référence fournisseur (optionnel)</Label>
              <Input placeholder="BL-2026-001" />
            </TextField>

            <TextField value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <TextArea placeholder="Constat à l'arrivée..." rows={2} />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Confirmer la réception"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
