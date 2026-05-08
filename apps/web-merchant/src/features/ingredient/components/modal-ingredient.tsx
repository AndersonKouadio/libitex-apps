"use client";

import { useState, useEffect } from "react";
import { Modal, Button, TextField, Label, Input, TextArea } from "@heroui/react";
import { Wheat, Pencil } from "lucide-react";
import { creerIngredientSchema, type CreerIngredientDTO } from "../schemas/ingredient.schema";
import {
  useAjouterIngredientMutation, useModifierIngredientMutation,
} from "../queries/ingredient-mutations";
import { UniteMesure, UNITE_LABELS } from "@/features/unite/types/unite.type";
import { SelectUnite } from "@/features/unite/components/select-unite";
import type { IIngredient } from "../types/ingredient.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Si fourni, modale en mode edition. Sinon mode creation. */
  ingredient?: IIngredient | null;
}

const VIDE: CreerIngredientDTO = {
  nom: "", description: "", unite: UniteMesure.KG, prixUnitaire: 0, seuilAlerte: 0,
};

export function ModalIngredient({ ouvert, onFermer, ingredient }: Props) {
  const ajouter = useAjouterIngredientMutation();
  const modifier = useModifierIngredientMutation();
  const [form, setForm] = useState<CreerIngredientDTO>(VIDE);
  const [erreur, setErreur] = useState("");

  const editing = !!ingredient;

  useEffect(() => {
    if (ingredient) {
      setForm({
        nom: ingredient.nom,
        description: ingredient.description ?? "",
        unite: ingredient.unite,
        prixUnitaire: ingredient.prixUnitaire,
        seuilAlerte: ingredient.seuilAlerte,
      });
    } else {
      setForm(VIDE);
    }
    setErreur("");
  }, [ingredient, ouvert]);

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
      if (editing && ingredient) {
        await modifier.mutateAsync({ id: ingredient.id, data: validation.data });
      } else {
        await ajouter.mutateAsync(validation.data);
      }
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  const enCours = ajouter.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              {editing ? <Pencil className="size-5" /> : <Wheat className="size-5" />}
            </Modal.Icon>
            <Modal.Heading>{editing ? "Modifier l'ingrédient" : "Nouvel ingrédient"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>}

            <TextField isRequired name="nom" value={form.nom} onChange={(v) => maj("nom", v)}>
              <Label>Nom de l'ingrédient</Label>
              <Input placeholder="Farine, huile d'olive, tomate..." />
            </TextField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectUnite
                isRequired
                label="Unité de mesure"
                valeur={form.unite}
                onChange={(u) => maj("unite", u)}
              />

              <TextField
                name="prixUnitaire"
                type="number"
                value={form.prixUnitaire ? String(form.prixUnitaire) : ""}
                onChange={(v) => maj("prixUnitaire", v ? Number(v) : 0)}
              >
                <Label>Prix d'achat par {UNITE_LABELS[form.unite]} (F CFA)</Label>
                <Input placeholder="850" min="0" />
              </TextField>
            </div>

            <TextField
              name="seuilAlerte"
              type="number"
              value={form.seuilAlerte ? String(form.seuilAlerte) : ""}
              onChange={(v) => maj("seuilAlerte", v ? Number(v) : 0)}
            >
              <Label>Seuil d'alerte stock bas (en {UNITE_LABELS[form.unite]})</Label>
              <Input placeholder="5" min="0" />
            </TextField>

            <TextField name="description" value={form.description ?? ""} onChange={(v) => maj("description", v)}>
              <Label>Description (optionnel)</Label>
              <TextArea placeholder="Origine, fournisseur, particularités..." rows={2} />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={enCours}>
              {enCours ? "Enregistrement..." : editing ? "Enregistrer" : "Créer l'ingrédient"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
