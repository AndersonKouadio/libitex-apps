"use client";

import { useState } from "react";
import {
  Modal, Button, TextField, Label, Input, Select, ListBox,
} from "@heroui/react";
import { Plus, Package } from "lucide-react";
import { creerProduitSchema, type CreerProduitDTO, type CreerVarianteDTO } from "../schemas/produit.schema";
import { useAjouterProduitMutation } from "../queries/produit-add.mutation";
import { LigneVarianteForm } from "./ligne-variante-form";

const TYPES_PRODUIT = [
  { id: "SIMPLE", label: "Standard" },
  { id: "VARIANT", label: "Variantes (taille, couleur...)" },
  { id: "SERIALIZED", label: "Serialise (IMEI, N/S)" },
  { id: "PERISHABLE", label: "Perissable (DLC)" },
] as const;

const VARIANTE_VIDE: CreerVarianteDTO = { sku: "", prixDetail: 0 };

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export function ModalCreerProduit({ ouvert, onFermer }: Props) {
  const mutation = useAjouterProduitMutation();

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [typeProduit, setTypeProduit] = useState<string>("SIMPLE");
  const [marque, setMarque] = useState("");
  const [variantes, setVariantes] = useState<CreerVarianteDTO[]>([{ ...VARIANTE_VIDE }]);
  const [erreur, setErreur] = useState("");

  function modifierVariante(index: number, data: Partial<CreerVarianteDTO>) {
    setVariantes((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...data } : v)),
    );
  }

  function retirerVariante(index: number) {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  }

  function ajouterVariante() {
    setVariantes((prev) => [...prev, { ...VARIANTE_VIDE }]);
  }

  function reinitialiser() {
    setNom("");
    setDescription("");
    setTypeProduit("SIMPLE");
    setMarque("");
    setVariantes([{ ...VARIANTE_VIDE }]);
    setErreur("");
  }

  async function soumettre() {
    setErreur("");

    const donnees: CreerProduitDTO = {
      nom,
      description: description || undefined,
      typeProduit: typeProduit as CreerProduitDTO["typeProduit"],
      marque: marque || undefined,
      variantes,
    };

    const validation = creerProduitSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Donnees invalides");
      return;
    }

    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la creation");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
              <Package className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Nouveau produit</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-5">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">
                {erreur}
              </div>
            )}

            {/* Informations generales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                isRequired
                className="sm:col-span-2"
                name="nom"
                value={nom}
                onChange={setNom}
              >
                <Label>Nom du produit</Label>
                <Input placeholder="Samsung Galaxy A15" />
              </TextField>

              <Select
                name="typeProduit"
                selectedKey={typeProduit}
                onSelectionChange={(key) => setTypeProduit(String(key))}
              >
                <Label>Type de produit</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {TYPES_PRODUIT.map((t) => (
                      <ListBox.Item key={t.id} id={t.id} textValue={t.label}>
                        {t.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField name="marque" value={marque} onChange={setMarque}>
                <Label>Marque</Label>
                <Input placeholder="Samsung, Nike..." />
              </TextField>
            </div>

            <TextField name="description" value={description} onChange={setDescription}>
              <Label>Description</Label>
              <Input placeholder="Description courte du produit" />
            </TextField>

            {/* Variantes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">
                  Variantes ({variantes.length})
                </p>
                <Button
                  variant="ghost"
                  className="gap-1.5 text-xs"
                  onPress={ajouterVariante}
                >
                  <Plus size={14} />
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {variantes.map((v, i) => (
                  <LigneVarianteForm
                    key={i}
                    index={i}
                    variante={v}
                    onChange={modifierVariante}
                    onRetirer={retirerVariante}
                    seulElement={variantes.length === 1}
                  />
                ))}
              </div>
            </div>
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
              {mutation.isPending ? "Creation..." : "Creer le produit"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
