"use client";

import { Modal, Button, toast } from "@heroui/react";
import { Package } from "lucide-react";
import { useFormProduit, type TypeProduit } from "../hooks/useFormProduit";
import { useAjouterProduitMutation } from "../queries/produit-add.mutation";
import { useCategorieListQuery } from "../queries/categorie-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ingredientAPI } from "@/features/ingredient/apis/ingredient.api";
import { useInvalidateIngredientQuery } from "@/features/ingredient/queries/index.query";
import { ChampsInfoProduit } from "./champs-info-produit";
import { SectionVarianteUnique } from "./section-variante-unique";
import { SectionVariantesAttributs } from "./section-variantes-attributs";
import { SectionRecetteMenu } from "./section-recette-menu";
import { SectionMetadataSecteur } from "./section-metadata-secteur";
import { SectionRestauration } from "./section-restauration";
import { ZoneUploadImages } from "@/features/upload/components/zone-upload-images";
import type { SecteurActivite } from "@/features/auth/types/auth.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

const TYPES_PAR_DEFAUT: TypeProduit[] = ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE", "MENU"];

export function ModalCreerProduit({ ouvert, onFermer }: Props) {
  const { token } = useAuth();
  const mutation = useAjouterProduitMutation();
  const { data: categories } = useCategorieListQuery();
  const { data: boutique } = useBoutiqueActiveQuery();
  const invalidateIngredients = useInvalidateIngredientQuery();
  const typesAutorises = (boutique?.typesProduitsAutorises ?? TYPES_PAR_DEFAUT) as TypeProduit[];
  const form = useFormProduit(typesAutorises);

  async function soumettre() {
    const donnees = form.valider();
    if (!donnees) return;
    try {
      const produit = await mutation.mutateAsync(donnees);

      // Pour un menu, sauvegarder la recette sur la première variante créée
      if (typeProduit === "MENU" && lignesRecette.length > 0 && produit.variantes[0] && token) {
        try {
          await ingredientAPI.definirRecette(token, produit.variantes[0].id, { lignes: lignesRecette });
          invalidateIngredients();
        } catch (err: unknown) {
          toast.danger(err instanceof Error
            ? `Produit créé mais recette non enregistrée : ${err.message}`
            : "Recette non enregistrée");
        }
      }

      form.reinitialiser();
      onFermer();
    } catch (err: unknown) {
      form.setErreur(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  }

  const {
    typeProduit, varianteUnique, axes, prefixeSku, variantesGenerees, images,
    metadataSecteur, lignesRecette, erreur,
    cookingTimeMinutes, prixPromotion, enPromotion, niveauEpice, tagsCuisine,
    enRupture, supplementIds,
  } = form.valeurs;
  const secteur = boutique?.secteurActivite as SecteurActivite | undefined;
  const estRestauration = secteur === "RESTAURATION" || typeProduit === "MENU";

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog className="!max-w-3xl">
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

            <ZoneUploadImages cible="produits" images={images} onChange={form.setImages} />

            {typeProduit === "VARIANT" ? (
              <SectionVariantesAttributs
                prefixeSku={prefixeSku}
                axes={axes}
                variantesGenerees={variantesGenerees}
                prixDetailReference={varianteUnique.prixDetail ? String(varianteUnique.prixDetail) : ""}
                varianteReference={varianteUnique}
                onPrefixe={form.setPrefixeSku}
                onPrixReference={(v) => form.setVarianteUnique({ ...varianteUnique, prixDetail: Number(v) || 0 })}
                onAjouterAxe={form.ajouterAxe}
                onRetirerAxe={form.retirerAxe}
                onModifierAxe={form.modifierAxe}
                onModifierVarianteReference={(data) => form.setVarianteUnique({ ...varianteUnique, ...data })}
              />
            ) : (
              <SectionVarianteUnique
                type={typeProduit}
                variante={varianteUnique}
                onChange={(data) => form.setVarianteUnique({ ...varianteUnique, ...data })}
                onRegenererSku={form.regenererSku}
              />
            )}

            {typeProduit === "MENU" && (
              <SectionRecetteMenu lignes={lignesRecette} onChange={form.setLignesRecette} />
            )}

            {estRestauration && (
              <SectionRestauration
                cookingTimeMinutes={cookingTimeMinutes}
                prixPromotion={prixPromotion}
                enPromotion={enPromotion}
                niveauEpice={niveauEpice}
                tagsCuisine={tagsCuisine}
                enRupture={enRupture}
                supplementIds={supplementIds}
                onCookingTimeMinutes={form.setCookingTimeMinutes}
                onPrixPromotion={form.setPrixPromotion}
                onEnPromotion={form.setEnPromotion}
                onNiveauEpice={form.setNiveauEpice}
                onTagsCuisine={form.setTagsCuisine}
                onEnRupture={form.setEnRupture}
                onSupplementIds={form.setSupplementIds}
              />
            )}

            <SectionMetadataSecteur
              secteur={secteur}
              metadata={metadataSecteur}
              onChange={form.setMetadataSecteur}
            />
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Création..." : "Créer le produit"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
