"use client";

import { useState } from "react";
import {
  Modal, Button, TextField, Label, Input, Select, ListBox, TextArea,
} from "@heroui/react";
import { PackagePlus } from "lucide-react";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "../queries/emplacement-list.query";
import { useEntreeStockMutation } from "../queries/stock-entree.mutation";
import { entreeStockSchema, type EntreeStockDTO } from "../schemas/stock.schema";
import type { IProduit } from "@/features/catalogue/types/produit.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export function ModalEntreeStock({ ouvert, onFermer }: Props) {
  const { data: produitsData } = useProduitListQuery(1);
  const { data: emplacements } = useEmplacementListQuery();
  const mutation = useEntreeStockMutation();

  const [varianteId, setVarianteId] = useState("");
  const [emplacementId, setEmplacementId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");

  const produits = produitsData?.data ?? [];

  // Construire la liste des variantes avec le nom du produit parent
  const optionsVariantes = produits.flatMap((p: IProduit) =>
    p.variantes.map((v) => ({
      id: v.id,
      label: v.nom ? `${p.nom} — ${v.nom} (${v.sku})` : `${p.nom} (${v.sku})`,
    })),
  );

  function reinitialiser() {
    setVarianteId("");
    setEmplacementId("");
    setQuantite("");
    setNote("");
    setErreur("");
  }

  async function soumettre() {
    setErreur("");

    const donnees: EntreeStockDTO = {
      varianteId,
      emplacementId: emplacementId || emplacements?.[0]?.id || "",
      quantite: Number(quantite) || 0,
      note: note || undefined,
    };

    const validation = entreeStockSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Donnees invalides");
      return;
    }

    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'entree en stock");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-success-soft text-success-soft-foreground">
              <PackagePlus className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Reception de marchandise</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">
                {erreur}
              </div>
            )}

            {/* Produit / Variante */}
            <Select
              isRequired
              name="varianteId"
              placeholder="Selectionnez un article"
              selectedKey={varianteId}
              onSelectionChange={(key) => setVarianteId(String(key))}
            >
              <Label>Produit / Variante</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {optionsVariantes.map((v) => (
                    <ListBox.Item key={v.id} id={v.id} textValue={v.label}>
                      {v.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Emplacement */}
            <Select
              isRequired
              name="emplacementId"
              selectedKey={emplacementId || emplacements?.[0]?.id || ""}
              onSelectionChange={(key) => setEmplacementId(String(key))}
            >
              <Label>Emplacement de destination</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(emplacements ?? []).map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>
                      {e.nom}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Quantite */}
            <TextField
              isRequired
              name="quantite"
              type="number"
              value={quantite}
              onChange={setQuantite}
            >
              <Label>Quantite recue</Label>
              <Input placeholder="50" min="1" />
            </TextField>

            {/* Note */}
            <TextField name="note" value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <TextArea placeholder="Reference commande, nom fournisseur, constat a l'arrivee..." rows={2} />
            </TextField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">
              Annuler
            </Button>
            <Button
              variant="primary"
              onPress={soumettre}
              isDisabled={mutation.isPending}
            >
              {mutation.isPending ? "Enregistrement..." : "Confirmer la reception"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
