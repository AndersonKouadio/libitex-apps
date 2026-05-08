"use client";

import { useRouter } from "next/navigation";
import { Button, Card, toast } from "@heroui/react";
import { ArrowLeft, Save } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useFormProduit, type TypeProduit } from "@/features/catalogue/hooks/useFormProduit";
import { useAjouterProduitMutation } from "@/features/catalogue/queries/produit-add.mutation";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ingredientAPI } from "@/features/ingredient/apis/ingredient.api";
import { useInvalidateIngredientQuery } from "@/features/ingredient/queries/index.query";
import { ChampsInfoProduit } from "@/features/catalogue/components/champs-info-produit";
import { SectionVarianteUnique } from "@/features/catalogue/components/section-variante-unique";
import { SectionVariantesAttributs } from "@/features/catalogue/components/section-variantes-attributs";
import { SectionRecetteMenu } from "@/features/catalogue/components/section-recette-menu";
import { SectionMetadataSecteur } from "@/features/catalogue/components/section-metadata-secteur";
import { SectionRestauration } from "@/features/catalogue/components/section-restauration";
import { SectionDisponibilite } from "@/features/catalogue/components/section-disponibilite";
import { ZoneUploadImages } from "@/features/upload/components/zone-upload-images";
import type { SecteurActivite } from "@/features/auth/types/auth.type";

const TYPES_PAR_DEFAUT: TypeProduit[] = ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE", "MENU"];

export default function PageNouveauProduit() {
  const router = useRouter();
  const { token } = useAuth();
  const mutation = useAjouterProduitMutation();
  const { data: categories } = useCategorieListQuery();
  const { data: boutique } = useBoutiqueActiveQuery();
  const invalidateIngredients = useInvalidateIngredientQuery();
  const typesAutorises = (boutique?.typesProduitsAutorises ?? TYPES_PAR_DEFAUT) as TypeProduit[];
  const form = useFormProduit(typesAutorises);

  const {
    typeProduit, varianteUnique, axes, prefixeSku, variantesGenerees, images,
    metadataSecteur, lignesRecette, erreur,
    cookingTimeMinutes, prixPromotion, enPromotion, niveauEpice, tagsCuisine,
    enRupture,
    modeDisponibilite, planningDisponibilite, emplacementsDisponibles,
  } = form.valeurs;
  const secteur = boutique?.secteurActivite as SecteurActivite | undefined;
  const estRestauration = secteur === "RESTAURATION" || typeProduit === "MENU";

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

      router.push("/catalogue");
    } catch (err: unknown) {
      form.setErreur(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  }

  return (
    <PageContainer taille="moyen">
      <PageHeader
        titre="Nouveau produit"
        description="Renseignez les informations principales, le prix et la disponibilité. Les champs spécifiques au secteur (restauration, etc.) apparaissent automatiquement."
        actions={
          <>
            <Button
              variant="ghost"
              className="gap-1.5"
              onPress={() => router.push("/catalogue")}
            >
              <ArrowLeft size={16} />
              Annuler
            </Button>
            <Button
              variant="primary"
              className="gap-1.5"
              onPress={soumettre}
              isDisabled={mutation.isPending}
            >
              <Save size={16} />
              {mutation.isPending ? "Création..." : "Créer le produit"}
            </Button>
          </>
        }
      />

      <Card>
        <Card.Content className="p-6 space-y-6">
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
              onCookingTimeMinutes={form.setCookingTimeMinutes}
              onPrixPromotion={form.setPrixPromotion}
              onEnPromotion={form.setEnPromotion}
              onNiveauEpice={form.setNiveauEpice}
              onTagsCuisine={form.setTagsCuisine}
              onEnRupture={form.setEnRupture}
            />
          )}

          <SectionMetadataSecteur
            secteur={secteur}
            metadata={metadataSecteur}
            onChange={form.setMetadataSecteur}
          />

          <SectionDisponibilite
            modeDisponibilite={modeDisponibilite}
            planningDisponibilite={planningDisponibilite}
            emplacementsDisponibles={emplacementsDisponibles}
            onModeDisponibilite={form.setModeDisponibilite}
            onPlanningDisponibilite={form.setPlanningDisponibilite}
            onEmplacementsDisponibles={form.setEmplacementsDisponibles}
          />
        </Card.Content>
      </Card>
    </PageContainer>
  );
}
