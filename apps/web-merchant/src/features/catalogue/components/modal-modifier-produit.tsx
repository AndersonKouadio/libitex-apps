"use client";

import { useState, useEffect } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, TextArea, Switch,
  Select, ListBox,
} from "@heroui/react";
import { Pencil } from "lucide-react";
import type { IProduit } from "../types/produit.type";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { useModifierProduitMutation } from "../queries/produit-update.mutation";
import { useCategorieListQuery } from "../queries/categorie-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { ZoneUploadImages } from "@/features/upload/components/zone-upload-images";
import { SectionMetadataSecteur } from "./section-metadata-secteur";
import { modifierProduitSchema, type ModifierProduitDTO } from "../schemas/produit.schema";

interface Props {
  produit: IProduit | null;
  onFermer: () => void;
}

export function ModalModifierProduit({ produit, onFermer }: Props) {
  const mutation = useModifierProduitMutation();
  const { data: categories } = useCategorieListQuery();
  const { data: boutique } = useBoutiqueActiveQuery();
  const secteur = boutique?.secteurActivite as SecteurActivite | undefined;

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [marque, setMarque] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [metadataSecteur, setMetadataSecteur] = useState<Record<string, unknown>>({});
  const [actif, setActif] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!produit) return;
    setNom(produit.nom);
    setDescription(produit.description ?? "");
    setMarque(produit.marque ?? "");
    setCategorieId(produit.categorieId ?? "");
    setImages(produit.images ?? []);
    setMetadataSecteur(produit.metadataSecteur ?? {});
    setActif(produit.actif);
    setErreur("");
  }, [produit]);

  if (!produit) return null;

  async function soumettre() {
    if (!produit) return;
    setErreur("");
    const data: ModifierProduitDTO = {
      nom,
      description: description || undefined,
      marque: marque || undefined,
      categorieId: categorieId || undefined,
      images,
      metadataSecteur,
      actif,
    };
    const validation = modifierProduitSchema.safeParse(data);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync({ id: produit.id, data: validation.data });
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal.Backdrop isOpen onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Pencil className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Modifier le produit</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <TextField isRequired value={nom} onChange={setNom}>
              <Label>Nom du produit</Label>
              <Input autoFocus />
              <FieldError />
            </TextField>

            <TextField value={description} onChange={setDescription}>
              <Label>Description</Label>
              <TextArea rows={2} placeholder="Description courte (facultatif)" />
              <FieldError />
            </TextField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={marque} onChange={setMarque}>
                <Label>Marque</Label>
                <Input placeholder="Ex: Samsung" />
                <FieldError />
              </TextField>

              <Select
                selectedKey={categorieId || null}
                onSelectionChange={(k) => setCategorieId(k ? String(k) : "")}
                aria-label="Catégorie"
              >
                <Label>Catégorie</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(categories ?? []).map((c) => (
                      <ListBox.Item key={c.id} id={c.id} textValue={c.nom}>
                        {c.nom}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <ZoneUploadImages cible="produits" images={images} onChange={setImages} />

            <SectionMetadataSecteur
              secteur={secteur}
              metadata={metadataSecteur}
              onChange={setMetadataSecteur}
            />

            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Produit actif</p>
                <p className="text-xs text-muted">
                  Désactivez pour le retirer du POS sans le supprimer du catalogue.
                </p>
              </div>
              <Switch isSelected={actif} onChange={setActif} aria-label="Produit actif" />
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
