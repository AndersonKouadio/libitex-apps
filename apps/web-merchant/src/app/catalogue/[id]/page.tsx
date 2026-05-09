"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Button, TextField, Label, Input, FieldError, TextArea, Switch, Skeleton, Chip,
} from "@heroui/react";
import {
  ArrowLeft, Save, Trash2, Info, ImageIcon, Package, UtensilsCrossed,
  Sliders, ToggleLeft,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useProduitDetailQuery } from "@/features/catalogue/queries/produit-list.query";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { useModifierProduitMutation } from "@/features/catalogue/queries/produit-update.mutation";
import { useSupprimerProduitMutation } from "@/features/catalogue/queries/produit-delete.mutation";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { ZoneUploadImages } from "@/features/upload/components/zone-upload-images";
import { CarteSection } from "@/features/catalogue/components/carte-section";
import { SelectCategorieArborescence } from "@/features/catalogue/components/select-categorie-arborescence";
import { SectionMetadataSecteur } from "@/features/catalogue/components/section-metadata-secteur";
import { SectionRestauration } from "@/features/catalogue/components/section-restauration";
import { SectionDisponibilite } from "@/features/catalogue/components/section-disponibilite";
import { SectionVariantesEditer } from "@/features/catalogue/components/section-variantes-editer";
import { SectionRecetteEditer } from "@/features/catalogue/components/section-recette-editer";
import {
  modifierProduitSchema, type ModifierProduitDTO,
} from "@/features/catalogue/schemas/produit.schema";
import type {
  NiveauEpice, ModeDisponibilite, PlanningDisponibilite,
} from "@/features/catalogue/types/produit.type";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { useConfirmation } from "@/providers/confirmation-provider";

const LABELS_TYPE: Record<string, string> = {
  SIMPLE: "Standard",
  VARIANT: "Variantes",
  SERIALIZED: "Sérialisé",
  PERISHABLE: "Périssable",
  MENU: "Menu",
};

export default function PageModifierProduit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: produit, isLoading } = useProduitDetailQuery(id);
  const mutation = useModifierProduitMutation();
  const supprimer = useSupprimerProduitMutation();
  const confirmer = useConfirmation();
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
  const [cookingTimeMinutes, setCookingTimeMinutes] = useState<number | null>(null);
  const [prixPromotion, setPrixPromotion] = useState<number | null>(null);
  const [enPromotion, setEnPromotion] = useState(false);
  const [niveauEpice, setNiveauEpice] = useState<NiveauEpice | null>(null);
  const [tagsCuisine, setTagsCuisine] = useState<string[]>([]);
  const [enRupture, setEnRupture] = useState(false);
  const [modeDisponibilite, setModeDisponibilite] = useState<ModeDisponibilite>("TOUJOURS");
  const [planningDisponibilite, setPlanningDisponibilite] = useState<PlanningDisponibilite>({});
  const [emplacementsDisponibles, setEmplacementsDisponibles] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");

  const estMenu = produit?.typeProduit === "MENU";
  const estRestauration = secteur === "RESTAURATION" || estMenu;

  useEffect(() => {
    if (!produit) return;
    setNom(produit.nom);
    setDescription(produit.description ?? "");
    setMarque(produit.marque ?? "");
    setCategorieId(produit.categorieId ?? "");
    setImages(produit.images ?? []);
    setMetadataSecteur(produit.metadataSecteur ?? {});
    setActif(produit.actif);
    setCookingTimeMinutes(produit.cookingTimeMinutes);
    setPrixPromotion(produit.prixPromotion);
    setEnPromotion(produit.enPromotion);
    setNiveauEpice(produit.niveauEpice);
    setTagsCuisine(produit.tagsCuisine ?? []);
    setEnRupture(produit.enRupture);
    setModeDisponibilite(produit.modeDisponibilite ?? "TOUJOURS");
    setPlanningDisponibilite(produit.planningDisponibilite ?? {});
    setEmplacementsDisponibles(produit.emplacementsDisponibles ?? []);
    setErreur("");
  }, [produit]);

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
      cookingTimeMinutes: cookingTimeMinutes ?? undefined,
      prixPromotion: prixPromotion ?? undefined,
      enPromotion,
      niveauEpice: niveauEpice ?? undefined,
      tagsCuisine,
      enRupture,
      modeDisponibilite,
      planningDisponibilite: modeDisponibilite === "PROGRAMME" ? planningDisponibilite : undefined,
      emplacementsDisponibles,
      actif,
    };
    const validation = modifierProduitSchema.safeParse(data);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync({ id: produit.id, data: validation.data });
      router.push("/catalogue");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleSupprimer() {
    if (!produit) return;
    const ok = await confirmer({
      titre: "Supprimer ce produit ?",
      description: `Le produit « ${produit.nom} » et ses variantes seront supprimés. L'historique de stock reste consultable mais le produit n'apparaît plus au POS.`,
      actionLibelle: "Supprimer définitivement",
    });
    if (!ok) return;
    await supprimer.mutateAsync(produit.id);
    router.push("/catalogue");
  }

  if (isLoading || !produit) {
    return (
      <PageContainer>
        <PageHeader titre="Modifier le produit" description="Chargement..." />
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titre={produit.nom}
        description="Mettez à jour les informations, les variantes et la disponibilité."
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" onPress={() => router.push("/catalogue")}>
              <ArrowLeft size={16} />
              Retour
            </Button>
            <Button
              variant="primary"
              className="gap-1.5"
              onPress={soumettre}
              isDisabled={mutation.isPending}
            >
              <Save size={16} />
              {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </>
        }
      />

      {erreur && (
        <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm mb-4">{erreur}</div>
      )}

      <div className="space-y-5">
        <CarteSection
          icone={Info}
          titre="Informations générales"
          description="Identité, classification et fiscalité."
          variante="accent"
        >
          <div className="flex items-center gap-2 -mt-1 mb-1">
            <Chip className="text-xs">{LABELS_TYPE[produit.typeProduit] ?? produit.typeProduit}</Chip>
            <span className="text-xs text-muted">Le type ne peut pas être modifié après création.</span>
          </div>

          <TextField isRequired value={nom} onChange={setNom}>
            <Label>Nom du produit</Label>
            <Input autoFocus />
            <FieldError />
          </TextField>

          <TextField value={description} onChange={setDescription}>
            <Label>Description (optionnel)</Label>
            <TextArea
              placeholder="Quelques mots pour le client : ingrédients, taille, particularités…"
              rows={2}
            />
            <FieldError />
          </TextField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField value={marque} onChange={setMarque}>
              <Label>Marque</Label>
              <Input placeholder="Samsung, Nike..." />
            </TextField>
            <div>
              <Label>Catégorie</Label>
              <SelectCategorieArborescence
                categories={categories ?? []}
                valeur={categorieId}
                onChange={setCategorieId}
                label="Catégorie"
                optionVideLabel="Aucune catégorie"
                isDisabled={(categories ?? []).length === 0}
              />
            </div>
          </div>
        </CarteSection>

        <CarteSection
          icone={ImageIcon}
          titre="Photos"
          description="La première image sert de vignette dans le catalogue et au POS."
          variante="secondary"
        >
          <ZoneUploadImages cible="produits" images={images} onChange={setImages} />
        </CarteSection>

        <CarteSection
          icone={Package}
          titre={produit.typeProduit === "VARIANT" ? "Variantes et prix" : "Référence et prix"}
          description={
            produit.typeProduit === "VARIANT"
              ? "Modifiez chaque variante individuellement (SKU, code-barres, prix)."
              : "Ajustez le SKU, le code-barres et la grille de prix."
          }
          variante="primary"
        >
          <SectionVariantesEditer produitId={produit.id} variantes={produit.variantes} />
        </CarteSection>

        {estMenu && produit.variantes[0] && (
          <CarteSection
            icone={UtensilsCrossed}
            titre="Recette du menu"
            description="Ingrédients consommés du stock à chaque vente du menu."
            variante="warning"
          >
            <SectionRecetteEditer varianteId={produit.variantes[0].id} />
          </CarteSection>
        )}

        {estRestauration && (
          <CarteSection
            icone={UtensilsCrossed}
            titre="Restauration"
            description="Temps de cuisson, promotion, niveau d'épice, tags cuisine."
            variante="warning"
          >
            <SectionRestauration
              cookingTimeMinutes={cookingTimeMinutes}
              prixPromotion={prixPromotion}
              enPromotion={enPromotion}
              niveauEpice={niveauEpice}
              tagsCuisine={tagsCuisine}
              enRupture={enRupture}
              onCookingTimeMinutes={setCookingTimeMinutes}
              onPrixPromotion={setPrixPromotion}
              onEnPromotion={setEnPromotion}
              onNiveauEpice={setNiveauEpice}
              onTagsCuisine={setTagsCuisine}
              onEnRupture={setEnRupture}
            />
          </CarteSection>
        )}

        {(secteur === "PHARMACIE" || secteur === "BIJOUTERIE" || secteur === "LIBRAIRIE") && (
          <CarteSection
            icone={Sliders}
            titre="Détails secteur"
            description="Champs spécifiques à votre activité."
            variante="muted"
          >
            <SectionMetadataSecteur
              secteur={secteur}
              metadata={metadataSecteur}
              onChange={setMetadataSecteur}
            />
          </CarteSection>
        )}

        <CarteSection
          icone={ToggleLeft}
          titre="Disponibilité et statut"
          description="Pilotez quand et où le produit est vendable."
          variante="success"
        >
          <SectionDisponibilite
            modeDisponibilite={modeDisponibilite}
            planningDisponibilite={planningDisponibilite}
            emplacementsDisponibles={emplacementsDisponibles}
            onModeDisponibilite={setModeDisponibilite}
            onPlanningDisponibilite={setPlanningDisponibilite}
            onEmplacementsDisponibles={setEmplacementsDisponibles}
          />

          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Produit actif</p>
              <p className="text-xs text-muted">
                Désactivez pour le retirer du POS sans le supprimer du catalogue.
              </p>
            </div>
            <Switch isSelected={actif} onChange={setActif} aria-label="Produit actif">
              <Switch.Control><Switch.Thumb /></Switch.Control>
            </Switch>
          </div>
        </CarteSection>

        <div className="rounded-xl border border-danger/30 p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Zone dangereuse</p>
            <p className="text-xs text-muted mt-1">
              La suppression efface le produit et toutes ses variantes. L'historique de stock reste consultable mais le produit n'apparaît plus au POS.
            </p>
          </div>
          <Button
            variant="danger"
            className="gap-1.5 shrink-0"
            onPress={handleSupprimer}
            isDisabled={supprimer.isPending}
          >
            <Trash2 size={14} />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-8 pt-5 border-t border-border">
        <Button variant="ghost" className="gap-1.5" onPress={() => router.push("/catalogue")}>
          <ArrowLeft size={16} />
          Retour
        </Button>
        <Button
          variant="primary"
          className="gap-1.5"
          onPress={soumettre}
          isDisabled={mutation.isPending}
        >
          <Save size={16} />
          {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </PageContainer>
  );
}
