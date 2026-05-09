"use client";

import { useState, useEffect } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError,
} from "@heroui/react";
import { Plus, Pencil, FolderTree } from "lucide-react";
import { useAjouterCategorieMutation } from "../queries/categorie-add.mutation";
import { useModifierCategorieMutation } from "../queries/categorie.mutations";
import { useCategorieListQuery } from "../queries/categorie-list.query";
import type { ICategorie } from "../types/produit.type";
import { SelectCategorieArborescence } from "./select-categorie-arborescence";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  categorie?: ICategorie | null;
}

export function ModalCategorie({ ouvert, onFermer, categorie }: Props) {
  const ajouter = useAjouterCategorieMutation();
  const modifier = useModifierCategorieMutation();
  const { data: categories } = useCategorieListQuery();
  const [nom, setNom] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [erreur, setErreur] = useState("");

  const editing = !!categorie;

  useEffect(() => {
    if (categorie) {
      setNom(categorie.nom);
      setParentId(categorie.parentId ?? "");
    } else {
      setNom("");
      setParentId("");
    }
    setErreur("");
  }, [categorie, ouvert]);

  async function soumettre() {
    setErreur("");
    if (!nom.trim()) {
      setErreur("Nom requis");
      return;
    }
    try {
      if (editing && categorie) {
        await modifier.mutateAsync({
          id: categorie.id,
          data: { nom: nom.trim(), parentId: parentId || undefined },
        });
      } else {
        await ajouter.mutateAsync({
          nom: nom.trim(),
          parentId: parentId || undefined,
        });
      }
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  const enCours = ajouter.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              {editing ? <Pencil className="size-5" /> : <Plus className="size-5" />}
            </Modal.Icon>
            <Modal.Heading>{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <TextField isRequired value={nom} onChange={setNom}>
              <Label>Nom</Label>
              <Input placeholder="Plats principaux" autoFocus />
              <FieldError />
            </TextField>

            <div>
              <Label className="flex items-center gap-1.5">
                <FolderTree size={12} />
                Catégorie parent (optionnel)
              </Label>
              <SelectCategorieArborescence
                categories={categories ?? []}
                valeur={parentId}
                onChange={setParentId}
                label="Catégorie parent"
                optionVideLabel="Aucun (catégorie racine)"
                exclureId={categorie?.id}
              />
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={enCours}>
              {enCours ? "Enregistrement..." : editing ? "Enregistrer" : "Créer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
