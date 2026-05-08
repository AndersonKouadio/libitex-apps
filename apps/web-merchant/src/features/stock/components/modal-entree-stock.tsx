"use client";

import { useState, useMemo } from "react";
import {
  Modal, Button, TextField, Label, Input, TextArea, FieldError,
} from "@heroui/react";
import { PackagePlus, AlertCircle } from "lucide-react";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "../queries/emplacement-list.query";
import { useEntreeStockMutation } from "../queries/stock-entree.mutation";
import { entreeStockSchema, type EntreeStockDTO } from "../schemas/stock.schema";
import { SelectVariante } from "./select-variante";
import { SelectEmplacement } from "./select-emplacement";
import { ChampDate } from "@/components/forms/champ-date";

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
  const [numeroLot, setNumeroLot] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [erreur, setErreur] = useState("");

  const produits = produitsData?.data ?? [];
  const emps = emplacements ?? [];

  // Detecte le type de produit selectionne pour afficher les champs lot/peremption
  const produitSelectionne = useMemo(() => {
    if (!varianteId) return null;
    for (const p of produits) {
      if (p.variantes.some((v) => v.id === varianteId)) return p;
    }
    return null;
  }, [varianteId, produits]);
  const estPerissable = produitSelectionne?.typeProduit === "PERISHABLE";

  function reinitialiser() {
    setVarianteId("");
    setEmplacementId("");
    setQuantite("");
    setNote("");
    setNumeroLot("");
    setDateExpiration("");
    setErreur("");
  }

  async function soumettre() {
    setErreur("");
    if (estPerissable && (!numeroLot || !dateExpiration)) {
      setErreur("Numéro de lot et date d'expiration requis pour un produit périssable");
      return;
    }
    const donnees: EntreeStockDTO = {
      varianteId,
      emplacementId: emplacementId || emps[0]?.id || "",
      quantite: Number(quantite) || 0,
      note: note || undefined,
      numeroLot: estPerissable ? numeroLot : undefined,
      dateExpiration: estPerissable && dateExpiration ? dateExpiration : undefined,
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
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <SelectVariante produits={produits} varianteId={varianteId} onChange={setVarianteId} />
            <SelectEmplacement emplacements={emps} emplacementId={emplacementId} onChange={setEmplacementId} />

            <TextField isRequired name="quantité" type="number" value={quantite} onChange={setQuantite}>
              <Label>Quantité reçue</Label>
              <Input placeholder="50" min="1" />
              <FieldError />
            </TextField>

            {estPerissable && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-3">
                <div className="flex items-start gap-2 text-warning text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Produit périssable : indiquez le numéro de lot et la date d'expiration.
                    Le POS appliquera FEFO (premier expiré, premier sorti).
                  </span>
                </div>
                <TextField isRequired value={numeroLot} onChange={setNumeroLot}>
                  <Label>Numéro de lot</Label>
                  <Input placeholder="LOT-2026-042" />
                  <FieldError />
                </TextField>
                <ChampDate
                  label="Date d'expiration"
                  value={dateExpiration}
                  onChange={setDateExpiration}
                  isRequired
                />
              </div>
            )}

            <TextField name="note" value={note} onChange={setNote}>
              <Label>Note (optionnel)</Label>
              <TextArea placeholder="Référence commande, nom fournisseur, constat à l'arrivée..." rows={2} />
              <FieldError />
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
