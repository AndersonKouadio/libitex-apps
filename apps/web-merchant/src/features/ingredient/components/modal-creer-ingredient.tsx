"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, Select, ListBox, TextArea } from "@heroui/react";
import { Wheat } from "lucide-react";
import { creerIngredientSchema, type CreerIngredientDTO } from "../schemas/ingredient.schema";
import { useAjouterIngredientMutation } from "../queries/ingredient-mutations";
import { UNITES_ORDONNEES, UNITE_LABELS, type UniteIngredient } from "../types/ingredient.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

const VIDE: CreerIngredientDTO = { nom: "", description: "", unite: "KG", prixUnitaire: 0, seuilAlerte: 0 };

export function ModalCreerIngredient({ ouvert, onFermer }: Props) {
  const mutation = useAjouterIngredientMutation();
  const [form, setForm] = useState<CreerIngredientDTO>(VIDE);
  const [erreur, setErreur] = useState("");

  function maj<K extends keyof CreerIngredientDTO>(champ: K, valeur: CreerIngredientDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  async function soumettre() {
    setErreur("");
    const validation = creerIngredientSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync(validation.data);
      setForm(VIDE);
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
            <Modal.Icon className="bg-warning/10 text-warning"><Wheat className="size-5" /></Modal.Icon>
            <Modal.Heading>Nouvel ingrédient</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>}

            <TextField isRequired name="nom" value={form.nom} onChange={(v) => maj("nom", v)}>
              <Label>Nom de l'ingrédient</Label>
              <Input placeholder="Farine, huile d'olive, tomate..." />
            </TextField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                isRequired
                selectedKey={form.unite}
                onSelectionChange={(k) => maj("unite", String(k) as UniteIngredient)}
              >
                <Label>Unité de mesure</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {UNITES_ORDONNEES.map((u) => (
                      <ListBox.Item key={u} id={u} textValue={UNITE_LABELS[u]}>
                        {UNITE_LABELS[u]}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField
                name="prixUnitaire"
                type="number"
                value={form.prixUnitaire ? String(form.prixUnitaire) : ""}
                onChange={(v) => maj("prixUnitaire", v ? Number(v) : 0)}
              >
                <Label>Prix d'achat par {UNITE_LABELS[form.unite as UniteIngredient]} (F CFA)</Label>
                <Input placeholder="850" min="0" />
              </TextField>
            </div>

            <TextField
              name="seuilAlerte"
              type="number"
              value={form.seuilAlerte ? String(form.seuilAlerte) : ""}
              onChange={(v) => maj("seuilAlerte", v ? Number(v) : 0)}
            >
              <Label>Seuil d'alerte stock bas (en {UNITE_LABELS[form.unite as UniteIngredient]})</Label>
              <Input placeholder="5" min="0" />
            </TextField>

            <TextField name="description" value={form.description ?? ""} onChange={(v) => maj("description", v)}>
              <Label>Description (optionnel)</Label>
              <TextArea placeholder="Origine, fournisseur, particularités..." rows={2} />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Création..." : "Créer l'ingrédient"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
