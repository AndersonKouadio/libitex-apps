"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, TextArea } from "@heroui/react";
import { ArrowRightLeft } from "lucide-react";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "../queries/emplacement-list.query";
import { useTransfertStockMutation } from "../queries/stock-transfert.mutation";
import { transfertStockSchema, type TransfertStockDTO } from "../schemas/stock.schema";
import { SelectVariante } from "./select-variante";
import { SelectEmplacement } from "./select-emplacement";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  emplacementSourceParDefaut?: string;
}

export function ModalTransfertStock({ ouvert, onFermer, emplacementSourceParDefaut }: Props) {
  const { data: produitsData } = useProduitListQuery(1);
  const { data: emplacements } = useEmplacementListQuery();
  const mutation = useTransfertStockMutation();

  const [varianteId, setVarianteId] = useState("");
  const [depuisId, setDepuisId] = useState(emplacementSourceParDefaut ?? "");
  const [versId, setVersId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");

  const produits = produitsData?.data ?? [];
  const emps = emplacements ?? [];
  const empsSource = emps;
  const empsDest = emps.filter((e) => e.id !== (depuisId || empsSource[0]?.id));

  function reinitialiser() {
    setVarianteId(""); setDepuisId(emplacementSourceParDefaut ?? "");
    setVersId(""); setQuantite(""); setNote(""); setErreur("");
  }

  async function soumettre() {
    setErreur("");
    const donnees: TransfertStockDTO = {
      varianteId,
      depuisEmplacementId: depuisId || empsSource[0]?.id || "",
      versEmplacementId: versId || empsDest[0]?.id || "",
      quantite: Number(quantite) || 0,
      note: note || undefined,
    };

    const validation = transfertStockSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }

    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err: unknown) {
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
            <Modal.Heading>Transfert entre emplacements</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <SelectVariante produits={produits} varianteId={varianteId} onChange={setVarianteId} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectEmplacement
                emplacements={empsSource}
                emplacementId={depuisId}
                onChange={(id) => { setDepuisId(id); if (id === versId) setVersId(""); }}
                label="Depuis"
              />
              <SelectEmplacement
                emplacements={empsDest}
                emplacementId={versId}
                onChange={setVersId}
                label="Vers"
              />
            </div>

            <TextField isRequired name="quantité" type="number" value={quantite} onChange={setQuantite}>
              <Label>Quantité a transferer</Label>
              <Input placeholder="10" min="1" />
            </TextField>

            <TextField name="note" value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <TextArea placeholder="Motif du transfert, référence du bon..." rows={2} />
            </TextField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Transfert..." : "Confirmer le transfert"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
