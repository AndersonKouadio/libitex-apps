"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, TextArea } from "@heroui/react";
import { PackagePlus } from "lucide-react";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "../queries/emplacement-list.query";
import { useEntreeStockMutation } from "../queries/stock-entree.mutation";
import { entreeStockSchema, type EntreeStockDTO } from "../schemas/stock.schema";
import { SelectVariante } from "./select-variante";
import { SelectEmplacement } from "./select-emplacement";

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
  const emps = emplacements ?? [];

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
      emplacementId: emplacementId || emps[0]?.id || "",
      quantite: Number(quantite) || 0,
      note: note || undefined,
    };

    const validation = entreeStockSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
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
            <Modal.Icon className="bg-success/10 text-success">
              <PackagePlus className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Réception de marchandise</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <SelectVariante produits={produits} varianteId={varianteId} onChange={setVarianteId} />
            <SelectEmplacement emplacements={emps} emplacementId={emplacementId} onChange={setEmplacementId} />

            <TextField isRequired name="quantité" type="number" value={quantite} onChange={setQuantite}>
              <Label>Quantité recue</Label>
              <Input placeholder="50" min="1" />
            </TextField>

            <TextField name="note" value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <TextArea placeholder="Référence commande, nom fournisseur, constat a l'arrivee..." rows={2} />
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
