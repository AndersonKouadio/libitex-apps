"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Card, TextField, Label, Input, FieldError, TextArea, Switch,
  Select, ListBox, Skeleton,
} from "@heroui/react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useProduitDetailQuery } from "@/features/catalogue/queries/produit-list.query";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { useModifierProduitMutation } from "@/features/catalogue/queries/produit-update.mutation";
import { useSupprimerProduitMutation } from "@/features/catalogue/queries/produit-delete.mutation";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { ZoneUploadImages } from "@/features/upload/components/zone-upload-images";
import { SectionMetadataSecteur } from "@/features/catalogue/components/section-metadata-secteur";
import { SectionRestauration } from "@/features/catalogue/components/section-restauration";
import { SectionDisponibilite } from "@/features/catalogue/components/section-disponibilite";
import {
  modifierProduitSchema, type ModifierProduitDTO,
} from "@/features/catalogue/schemas/produit.schema";
import type {
  NiveauEpice, ModeDisponibilite, PlanningDisponibilite,
} from "@/features/catalogue/types/produit.type";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { useConfirmation } from "@/providers/confirmation-provider";

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

  const estRestauration = secteur === "RESTAURATION" || produit?.typeProduit === "MENU";

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

  return (
    <PageContainer>
      <PageHeader
        titre={produit ? produit.nom : "Modifier le produit"}
        description="Mettez à jour les informations, les options spécifiques au secteur et la disponibilité."
        actions={
          <>
            <Button
              variant="ghost"
              className="gap-1.5"
              onPress={() => router.push("/catalogue")}
            >
              <ArrowLeft size={16} />
              Retour
            </Button>
            <Button
              variant="primary"
              className="gap-1.5"
              onPress={soumettre}
              isDisabled={mutation.isPending || isLoading || !produit}
            >
              <Save size={16} />
              {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </>
        }
      />

      <Card>
        <Card.Content className="p-6 space-y-5">
          {isLoading || !produit ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : (
            <>
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
                  <Input placeholder="Ex : Samsung" />
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

              {estRestauration && (
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
              )}

              <SectionMetadataSecteur
                secteur={secteur}
                metadata={metadataSecteur}
                onChange={setMetadataSecteur}
              />

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
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {produit && (
        <Card className="mt-6 border-danger/30">
          <Card.Content className="p-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Zone dangereuse</p>
              <p className="text-xs text-muted mt-1">
                La suppression efface le produit et toutes ses variantes. Le stock historique reste consultable mais le produit n'apparaît plus au POS.
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
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
