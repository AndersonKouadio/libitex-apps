"use client";

import { Modal, Button } from "@heroui/react";
import { Package } from "lucide-react";
import { useFormProduit } from "../hooks/useFormProduit";
import { useAjouterProduitMutation } from "../queries/produit-add.mutation";
import { ChampsInfoProduit } from "./champs-info-produit";
import { SectionVariantes } from "./section-variantes";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export function ModalCreerProduit({ ouvert, onFermer }: Props) {
  const mutation = useAjouterProduitMutation();
  const form = useFormProduit();

  async function soumettre() {
    const donnees = form.valider();
    if (!donnees) return;

    try {
      await mutation.mutateAsync(donnees);
      form.reinitialiser();
      onFermer();
    } catch (err: unknown) {
      form.setErreur(err instanceof Error ? err.message : "Erreur lors de la creation");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Package className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Nouveau produit</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-5">
            {form.valeurs.erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">
                {form.valeurs.erreur}
              </div>
            )}

            <ChampsInfoProduit
              nom={form.valeurs.nom}
              description={form.valeurs.description}
              typeProduit={form.valeurs.typeProduit}
              marque={form.valeurs.marque}
              onNom={form.setNom}
              onDescription={form.setDescription}
              onTypeProduit={form.setTypeProduit}
              onMarque={form.setMarque}
            />

            <SectionVariantes
              variantes={form.valeurs.variantes}
              onChange={form.modifierVariante}
              onAjouter={form.ajouterVariante}
              onRetirer={form.retirerVariante}
            />
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">
              Annuler
            </Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Creation..." : "Creer le produit"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
