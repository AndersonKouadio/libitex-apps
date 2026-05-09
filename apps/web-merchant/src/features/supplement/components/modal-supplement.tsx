"use client";

import { useState, useEffect } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, TextArea,
  Select, ListBox, Switch,
} from "@heroui/react";
import { Plus, Pencil } from "lucide-react";
import { ZoneUploadImages } from "@/features/upload/components/zone-upload-images";
import {
  useCreerSupplementMutation, useModifierSupplementMutation,
} from "../queries/supplement.query";
import {
  CATEGORIES_SUPPLEMENT, LABELS_CATEGORIE_SUPPLEMENT,
  type CategorieSupplement, type ISupplement,
} from "../types/supplement.type";
import { creerSupplementSchema, type CreerSupplementDTO } from "../schemas/supplement.schema";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Si fourni, modal en mode edition. Sinon mode creation. */
  supplement?: ISupplement | null;
}

const VIDE: CreerSupplementDTO = {
  nom: "",
  description: "",
  prix: 0,
  categorie: "NOURRITURE",
  image: undefined,
};

export function ModalSupplement({ ouvert, onFermer, supplement }: Props) {
  const creer = useCreerSupplementMutation();
  const modifier = useModifierSupplementMutation();
  const [form, setForm] = useState<CreerSupplementDTO>(VIDE);
  const [actif, setActif] = useState(true);
  const [erreur, setErreur] = useState("");

  const editing = !!supplement;

  useEffect(() => {
    if (supplement) {
      setForm({
        nom: supplement.nom,
        description: supplement.description ?? "",
        prix: supplement.prix,
        categorie: supplement.categorie,
        image: supplement.image ?? undefined,
      });
      setActif(supplement.actif);
    } else {
      setForm(VIDE);
      setActif(true);
    }
    setErreur("");
  }, [supplement, ouvert]);

  function maj<K extends keyof CreerSupplementDTO>(champ: K, valeur: CreerSupplementDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  async function soumettre() {
    setErreur("");
    const validation = creerSupplementSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    try {
      if (editing && supplement) {
        await modifier.mutateAsync({ id: supplement.id, data: { ...validation.data, actif } });
      } else {
        await creer.mutateAsync(validation.data);
      }
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  const enCours = creer.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              {editing ? <Pencil className="size-5" /> : <Plus className="size-5" />}
            </Modal.Icon>
            <Modal.Heading>{editing ? "Modifier le supplément" : "Nouveau supplément"}</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <TextField isRequired value={form.nom} onChange={(v) => maj("nom", v)}>
              <Label>Nom</Label>
              <Input placeholder="Sauce piquante" autoFocus />
              <FieldError />
            </TextField>

            <TextField value={form.description ?? ""} onChange={(v) => maj("description", v)}>
              <Label>Description</Label>
              <TextArea placeholder="Sauce maison à base de piment frais" rows={2} />
              <FieldError />
            </TextField>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                isRequired
                type="number"
                value={String(form.prix || "")}
                onChange={(v) => maj("prix", Number(v) || 0)}
              >
                <Label>Prix (F CFA)</Label>
                <Input placeholder="500" min="0" />
                <FieldError />
              </TextField>

              <Select
                selectedKey={form.categorie}
                onSelectionChange={(k) => maj("categorie", k as CategorieSupplement)}
                aria-label="Catégorie"
              >
                <Label>Catégorie</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {CATEGORIES_SUPPLEMENT.map((c) => (
                      <ListBox.Item key={c} id={c} textValue={LABELS_CATEGORIE_SUPPLEMENT[c]}>
                        {LABELS_CATEGORIE_SUPPLEMENT[c]}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <ZoneUploadImages
              cible="produits"
              images={form.image ? [form.image] : []}
              onChange={(imgs) => maj("image", imgs[0])}
              max={1}
            />

            {editing && (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Supplément actif</p>
                  <p className="text-xs text-muted">Décochez pour le retirer du POS sans le supprimer.</p>
                </div>
                <Switch isSelected={actif} onChange={setActif} aria-label="Actif">
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={enCours}>
              {enCours ? "Enregistrement..." : editing ? "Enregistrer" : "Ajouter le supplément"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
