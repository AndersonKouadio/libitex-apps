"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { CheckCircle2, XCircle, Trash2, FolderInput, X as IconX } from "lucide-react";
import { SelectCategorieArborescence } from "./select-categorie-arborescence";
import { useConfirmation } from "@/providers/confirmation-provider";
import {
  useBasculerActifLotMutation,
  useSupprimerLotMutation,
  useChangerCategorieLotMutation,
} from "../queries/produit-lot.mutation";
import type { ICategorie } from "../types/produit.type";

interface Props {
  selection: string[];
  categories: ICategorie[];
  onTermine: () => void;
}

export function BarreActionsLot({ selection, categories, onTermine }: Props) {
  const confirmer = useConfirmation();
  const basculer = useBasculerActifLotMutation();
  const supprimer = useSupprimerLotMutation();
  const changerCat = useChangerCategorieLotMutation();
  const [modalCatOuvert, setModalCatOuvert] = useState(false);
  const [categorieChoisie, setCategorieChoisie] = useState<string>("");

  const total = selection.length;
  const enCours = basculer.isPending || supprimer.isPending || changerCat.isPending;

  async function handleSupprimer() {
    const ok = await confirmer({
      titre: `Supprimer ${total} produit${total > 1 ? "s" : ""} ?`,
      description: `Les produits sélectionnés et leurs variantes seront supprimés. L'historique de stock reste consultable.`,
      actionLibelle: "Supprimer définitivement",
    });
    if (!ok) return;
    await supprimer.mutateAsync(selection);
    onTermine();
  }

  async function handleChangerCategorie() {
    await changerCat.mutateAsync({
      ids: selection,
      categorieId: categorieChoisie || null,
    });
    setModalCatOuvert(false);
    setCategorieChoisie("");
    onTermine();
  }

  async function handleBasculer(actif: boolean) {
    await basculer.mutateAsync({ ids: selection, actif });
    onTermine();
  }

  return (
    <>
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background shadow-lg"
        role="region"
        aria-label="Actions sur la sélection"
      >
        <span className="text-sm font-medium px-2">
          {total} sélectionné{total > 1 ? "s" : ""}
        </span>
        <span className="w-px h-5 bg-background/20" />
        <Button
          variant="ghost"
          className="text-background hover:bg-background/10 gap-1.5 px-2.5 h-8 text-xs"
          onPress={() => handleBasculer(true)}
          isDisabled={enCours}
        >
          <CheckCircle2 size={14} />
          Activer
        </Button>
        <Button
          variant="ghost"
          className="text-background hover:bg-background/10 gap-1.5 px-2.5 h-8 text-xs"
          onPress={() => handleBasculer(false)}
          isDisabled={enCours}
        >
          <XCircle size={14} />
          Désactiver
        </Button>
        <Button
          variant="ghost"
          className="text-background hover:bg-background/10 gap-1.5 px-2.5 h-8 text-xs"
          onPress={() => setModalCatOuvert(true)}
          isDisabled={enCours || categories.length === 0}
        >
          <FolderInput size={14} />
          Changer catégorie
        </Button>
        <Button
          variant="ghost"
          className="text-danger hover:bg-danger/10 gap-1.5 px-2.5 h-8 text-xs"
          onPress={handleSupprimer}
          isDisabled={enCours}
        >
          <Trash2 size={14} />
          Supprimer
        </Button>
        <span className="w-px h-5 bg-background/20" />
        <Button
          variant="ghost"
          className="text-background/70 hover:bg-background/10 p-1.5 h-auto min-w-0"
          onPress={onTermine}
          aria-label="Annuler la sélection"
        >
          <IconX size={14} />
        </Button>
      </div>

      <Modal.Backdrop isOpen={modalCatOuvert} onOpenChange={setModalCatOuvert}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[440px]">
            <Modal.Header>
              <Modal.Heading>Déplacer dans une catégorie</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted mb-3">
                {total} produit{total > 1 ? "s seront déplacés" : " sera déplacé"} vers la catégorie choisie.
              </p>
              <SelectCategorieArborescence
                categories={categories}
                valeur={categorieChoisie}
                onChange={setCategorieChoisie}
                label="Catégorie cible"
                optionVideLabel="Aucune catégorie (retirer)"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => setModalCatOuvert(false)}>Annuler</Button>
              <Button
                variant="primary"
                onPress={handleChangerCategorie}
                isDisabled={changerCat.isPending}
              >
                Déplacer
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
