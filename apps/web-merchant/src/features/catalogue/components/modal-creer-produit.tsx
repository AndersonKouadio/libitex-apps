"use client";

import { Modal, Button } from "@heroui/react";
import { Package } from "lucide-react";
import { useFormProduit, type TypeProduit } from "../hooks/useFormProduit";
import { useAjouterProduitMutation } from "../queries/produit-add.mutation";
import { useCategorieListQuery } from "../queries/categorie-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { ChampsInfoProduit } from "./champs-info-produit";
import { SectionVarianteUnique } from "./section-variante-unique";
import { SectionVariantesAttributs } from "./section-variantes-attributs";
import { SectionImages } from "./section-images";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

const TYPES_PAR_DEFAUT: TypeProduit[] = ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE"];

export function ModalCreerProduit({ ouvert, onFermer }: Props) {
  const mutation = useAjouterProduitMutation();
  const { data: categories } = useCategorieListQuery();
  const { data: boutique } = useBoutiqueActiveQuery();
  const typesAutorises = (boutique?.typesProduitsAutorises ?? TYPES_PAR_DEFAUT) as TypeProduit[];
  const form = useFormProduit(typesAutorises);

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

  const { typeProduit, varianteUnique, axes, prefixeSku, variantesGenerees, images, erreur } = form.valeurs;

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

          <Modal.Body className="space-y-6">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">
                {erreur}
              </div>
            )}

            <ChampsInfoProduit
              nom={form.valeurs.nom}
              description={form.valeurs.description}
              typeProduit={typeProduit}
              marque={form.valeurs.marque}
              categorieId={form.valeurs.categorieId}
              codeBarresEan13={form.valeurs.codeBarresEan13}
              tauxTva={form.valeurs.tauxTva}
              categories={categories ?? []}
              typesAutorises={typesAutorises}
              onNom={form.setNom}
              onDescription={form.setDescription}
              onTypeProduit={form.setTypeProduit}
              onMarque={form.setMarque}
              onCategorieId={form.setCategorieId}
              onCodeBarresEan13={form.setCodeBarresEan13}
              onTauxTva={form.setTauxTva}
            />

            <SectionImages images={images} onChange={form.setImages} />

            {typeProduit === "VARIANT" ? (
              <SectionVariantesAttributs
                prefixeSku={prefixeSku}
                axes={axes}
                variantesGenerees={variantesGenerees}
                prixDetailReference={varianteUnique.prixDetail ? String(varianteUnique.prixDetail) : ""}
                onPrefixe={form.setPrefixeSku}
                onPrixReference={(v) => form.setVarianteUnique({ ...varianteUnique, prixDetail: Number(v) || 0 })}
                onAjouterAxe={form.ajouterAxe}
                onRetirerAxe={form.retirerAxe}
                onModifierAxe={form.modifierAxe}
              />
            ) : (
              <SectionVarianteUnique
                type={typeProduit}
                variante={varianteUnique}
                onChange={(data) => form.setVarianteUnique({ ...varianteUnique, ...data })}
              />
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Creation..." : "Creer le produit"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
