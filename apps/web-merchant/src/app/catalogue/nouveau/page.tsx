"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, toast } from "@heroui/react";
import {
  ArrowLeft, Save, Info, ImageIcon, Tag, UtensilsCrossed, Copy,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useFormProduit, type TypeProduit } from "@/features/catalogue/hooks/useFormProduit";
import { useAjouterProduitMutation } from "@/features/catalogue/queries/produit-add.mutation";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { useProduitDetailQuery } from "@/features/catalogue/queries/produit-list.query";
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
import { CarteSection } from "@/features/catalogue/components/carte-section";
import type { SecteurActivite } from "@/features/auth/types/auth.type";

const TYPES_PAR_DEFAUT: TypeProduit[] = ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE", "MENU"];

const TITRES_SKU: Record<TypeProduit, { titre: string; description: string }> = {
  SIMPLE:     { titre: "Référence et prix", description: "Identifiant unique et prix de vente." },
  VARIANT:    { titre: "Variantes et prix", description: "Définissez les attributs ; les variantes sont générées automatiquement." },
  SERIALIZED: { titre: "Référence et prix", description: "Numéros de série saisis à la réception du stock, pas ici." },
  PERISHABLE: { titre: "Référence et prix", description: "Lots et dates de péremption saisis à la réception du stock, pas ici." },
  MENU:       { titre: "Référence et prix", description: "Le stock du menu est géré via la recette ci-dessous." },
};

export default function PageNouveauProduit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const mutation = useAjouterProduitMutation();
  const { data: categories } = useCategorieListQuery();
  const { data: boutique } = useBoutiqueActiveQuery();
  const invalidateIngredients = useInvalidateIngredientQuery();
  const typesAutorises = (boutique?.typesProduitsAutorises ?? TYPES_PAR_DEFAUT) as TypeProduit[];
  const form = useFormProduit(typesAutorises);

  // Duplication : si ?dupliquer=<id>, on charge le produit source et on
  // pre-remplit le formulaire. Le suffixe " (copie)" est ajoute au nom.
  const dupliquerId = searchParams.get("dupliquer");
  const { data: produitSource } = useProduitDetailQuery(dupliquerId ?? "");
  const dupliqueAppliquee = useRef(false);
  useEffect(() => {
    if (!produitSource || dupliqueAppliquee.current) return;
    form.chargerDepuis({
      nom: produitSource.nom,
      description: produitSource.description,
      typeProduit: produitSource.typeProduit as TypeProduit,
      marque: produitSource.marque,
      categorieId: produitSource.categorieId,
      tauxTva: produitSource.tauxTva,
      images: produitSource.images,
      variantes: produitSource.variantes,
    });
    dupliqueAppliquee.current = true;
    toast.success(`"${produitSource.nom}" dupliqué — ajustez puis enregistrez`);
  }, [produitSource, form]);

  const {
    typeProduit, varianteUnique, axes, prefixeSku, variantesGenerees, images,
    metadataSecteur, lignesRecette, erreur,
    cookingTimeMinutes, prixPromotion, enPromotion, niveauEpice, tagsCuisine,
    enRupture,
    modeDisponibilite, planningDisponibilite, emplacementsDisponibles,
  } = form.valeurs;
  const secteur = boutique?.secteurActivite as SecteurActivite | undefined;
  const estRestauration = secteur === "RESTAURATION" || typeProduit === "MENU";
  const sku = TITRES_SKU[typeProduit];

  async function soumettre() {
    const donnees = form.valider();
    if (!donnees) return;
    try {
      const produit = await mutation.mutateAsync(donnees);
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
    <PageContainer>
      <PageHeader
        titre="Nouveau produit"
        description="Renseignez chaque section : les blocs spécifiques (recette, restauration, secteur) apparaissent automatiquement selon votre choix."
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" onPress={() => router.push("/catalogue")}>
              <ArrowLeft size={16} />
              Annuler
            </Button>
            <Button variant="primary" className="gap-1.5" onPress={soumettre} isDisabled={mutation.isPending}>
              <Save size={16} />
              {mutation.isPending ? "Création..." : "Créer le produit"}
            </Button>
          </>
        }
      />

      {erreur && (
        <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm mb-4">
          {erreur}
        </div>
      )}

      <div className="space-y-5">
        <CarteSection
          icone={Info}
          titre="Informations générales"
          description="Identité, classification et fiscalité. Le type pilote l'apparition des autres sections."
          variante="accent"
        >
          <ChampsInfoProduit
            nom={form.valeurs.nom}
            description={form.valeurs.description}
            typeProduit={typeProduit}
            marque={form.valeurs.marque}
            categorieId={form.valeurs.categorieId}
            tauxTva={form.valeurs.tauxTva}
            categories={categories ?? []}
            typesAutorises={typesAutorises}
            onNom={form.setNom}
            onDescription={form.setDescription}
            onTypeProduit={form.setTypeProduit}
            onMarque={form.setMarque}
            onCategorieId={form.setCategorieId}
            onTauxTva={form.setTauxTva}
          />
        </CarteSection>

        <CarteSection
          icone={ImageIcon}
          titre="Photos"
          description="La première image sert de vignette dans le catalogue et au POS."
          variante="secondary"
        >
          <ZoneUploadImages cible="produits" images={images} onChange={form.setImages} />
        </CarteSection>

        <CarteSection
          icone={Tag}
          titre={sku.titre}
          description={sku.description}
          variante="primary"
        >
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
            />
          )}
        </CarteSection>

        {typeProduit === "MENU" && (
          <CarteSection
            icone={UtensilsCrossed}
            titre="Recette du menu"
            description="Ingrédients consommés du stock à chaque vente du menu."
            variante="warning"
          >
            <SectionRecetteMenu lignes={lignesRecette} onChange={form.setLignesRecette} />
          </CarteSection>
        )}

        {estRestauration && (
          <Card>
            <Card.Content className="p-6">
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
            </Card.Content>
          </Card>
        )}

        {(secteur === "PHARMACIE" || secteur === "BIJOUTERIE" || secteur === "LIBRAIRIE") && (
          <Card>
            <Card.Content className="p-6">
              <SectionMetadataSecteur
                secteur={secteur}
                metadata={metadataSecteur}
                onChange={form.setMetadataSecteur}
              />
            </Card.Content>
          </Card>
        )}

        <Card>
          <Card.Content className="p-6">
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
      </div>

      <div className="flex justify-end gap-2 mt-8 pt-5 border-t border-border">
        <Button variant="ghost" className="gap-1.5" onPress={() => router.push("/catalogue")}>
          <ArrowLeft size={16} />
          Annuler
        </Button>
        <Button variant="primary" className="gap-1.5" onPress={soumettre} isDisabled={mutation.isPending}>
          <Save size={16} />
          {mutation.isPending ? "Création..." : "Créer le produit"}
        </Button>
      </div>
    </PageContainer>
  );
}
