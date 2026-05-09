"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { creerProduitSchema, type CreerProduitDTO, type CreerVarianteDTO } from "../schemas/produit.schema";
import { genererVariantesParCombinaison, type AxeAttribut } from "../utils/generer-variantes";
import { genererSku, genererPrefixeSku } from "../utils/generer-sku";
import type { LigneRecetteDTO } from "@/features/ingredient/schemas/ingredient.schema";
import { UniteMesure } from "@/features/unite/types/unite.type";

const VARIANTE_VIDE: CreerVarianteDTO = {
  sku: "", prixDetail: 0,
  uniteVente: UniteMesure.PIECE, prixParUnite: false,
};

export type TypeProduit = "SIMPLE" | "VARIANT" | "SERIALIZED" | "PERISHABLE" | "MENU";

export interface EtatFormProduit {
  nom: string;
  description: string;
  typeProduit: TypeProduit;
  marque: string;
  categorieId: string;
  tauxTva: string;
  prefixeSku: string;
  axes: AxeAttribut[];
  varianteUnique: CreerVarianteDTO;
  erreur: string;
}

const AXES_VIDES: AxeAttribut[] = [{ nom: "", valeurs: [] }];

export function useFormProduit(typesAutorises: TypeProduit[] = ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE", "MENU"]) {
  const typeParDefaut = typesAutorises[0] ?? "SIMPLE";
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [typeProduit, setTypeProduit] = useState<TypeProduit>(typeParDefaut);

  useEffect(() => {
    if (!typesAutorises.includes(typeProduit)) {
      setTypeProduit(typesAutorises[0] ?? "SIMPLE");
    }
  }, [typesAutorises, typeProduit]);
  const [marque, setMarque] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [tauxTva, setTauxTva] = useState("0");
  const [prefixeSku, setPrefixeSku] = useState("");
  const [axes, setAxes] = useState<AxeAttribut[]>(AXES_VIDES);
  const [varianteUnique, setVarianteUnique] = useState<CreerVarianteDTO>({ ...VARIANTE_VIDE });
  const [images, setImages] = useState<string[]>([]);
  const [metadataSecteur, setMetadataSecteur] = useState<Record<string, unknown>>({});
  const [lignesRecette, setLignesRecette] = useState<LigneRecetteDTO[]>([]);
  // Restauration
  const [cookingTimeMinutes, setCookingTimeMinutes] = useState<number | null>(null);
  const [prixPromotion, setPrixPromotion] = useState<number | null>(null);
  const [enPromotion, setEnPromotion] = useState(false);
  const [niveauEpice, setNiveauEpice] = useState<"TOUJOURS_EPICE" | "JAMAIS_EPICE" | "AU_CHOIX" | null>(null);
  const [tagsCuisine, setTagsCuisine] = useState<string[]>([]);
  const [enRupture, setEnRupture] = useState(false);
  // Disponibilite
  const [modeDisponibilite, setModeDisponibilite] = useState<"TOUJOURS" | "PROGRAMME">("TOUJOURS");
  const [planningDisponibilite, setPlanningDisponibilite] = useState<
    Record<string, Array<{ from: string; to: string }>>
  >({});
  const [emplacementsDisponibles, setEmplacementsDisponibles] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
  // Suivi de l'edition manuelle du SKU. Si l'utilisateur modifie le SKU
  // a la main, on cesse de l'auto-regenerer quand le nom change.
  const [skuManuel, setSkuManuel] = useState(false);
  const [prefixeSkuManuel, setPrefixeSkuManuel] = useState(false);

  // Auto-generation du SKU (et du prefixe pour les variantes)
  // a chaque changement de nom ou de type, tant que l'utilisateur
  // n'a pas pris la main dessus.
  useEffect(() => {
    if (!nom || nom.length < 2) return;
    if (typeProduit === "VARIANT") {
      if (!prefixeSkuManuel) setPrefixeSku(genererPrefixeSku(nom));
    } else if (!skuManuel) {
      setVarianteUnique((prev) => ({ ...prev, sku: genererSku(nom, typeProduit) }));
    }
  }, [nom, typeProduit, skuManuel, prefixeSkuManuel]);

  const variantesGenerees = useMemo(() => {
    if (typeProduit === "VARIANT") {
      // Les attributs definissent uniquement la combinatoire ; les reglages
      // de vente (unite, pasMin, prix par unite) sont partages entre toutes
      // les variantes generees, on les copie depuis la variante de reference.
      return genererVariantesParCombinaison(axes, prefixeSku, varianteUnique.prixDetail, {
        uniteVente: varianteUnique.uniteVente,
        pasMin: varianteUnique.pasMin,
        prixParUnite: varianteUnique.prixParUnite,
      });
    }
    return [varianteUnique];
  }, [typeProduit, axes, prefixeSku, varianteUnique]);

  const ajouterAxe = useCallback(() => {
    setAxes((prev) => [...prev, { nom: "", valeurs: [] }]);
  }, []);

  const retirerAxe = useCallback((index: number) => {
    setAxes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const modifierAxe = useCallback((index: number, data: Partial<AxeAttribut>) => {
    setAxes((prev) => prev.map((a, i) => (i === index ? { ...a, ...data } : a)));
  }, []);

  const reinitialiser = useCallback(() => {
    setNom(""); setDescription(""); setTypeProduit(typeParDefaut); setMarque("");
    setCategorieId(""); setTauxTva("0"); setPrefixeSku("");
    setAxes(AXES_VIDES); setVarianteUnique({ ...VARIANTE_VIDE }); setImages([]);
    setMetadataSecteur({}); setLignesRecette([]); setErreur("");
    setCookingTimeMinutes(null); setPrixPromotion(null); setEnPromotion(false);
    setNiveauEpice(null); setTagsCuisine([]); setEnRupture(false);
    setModeDisponibilite("TOUJOURS"); setPlanningDisponibilite({}); setEmplacementsDisponibles([]);
    setSkuManuel(false); setPrefixeSkuManuel(false);
  }, [typeParDefaut]);

  // Wrapper qui marque le SKU comme manuel quand l'utilisateur le modifie
  // (et permet de revenir en mode automatique en vidant le champ).
  const setVarianteUniqueAvecSkuTracking = useCallback((data: CreerVarianteDTO) => {
    setVarianteUnique((prev) => {
      if (data.sku !== prev.sku) {
        setSkuManuel(data.sku.length > 0);
      }
      return data;
    });
  }, []);

  const setPrefixeSkuAvecTracking = useCallback((p: string) => {
    setPrefixeSku(p);
    setPrefixeSkuManuel(p.length > 0 && p !== genererPrefixeSku(nom));
  }, [nom]);

  /** Force la regeneration du SKU et reactive le mode auto. */
  const regenererSku = useCallback(() => {
    if (!nom) return;
    if (typeProduit === "VARIANT") {
      setPrefixeSkuManuel(false);
      setPrefixeSku(genererPrefixeSku(nom));
    } else {
      setSkuManuel(false);
      setVarianteUnique((prev) => ({ ...prev, sku: genererSku(nom, typeProduit) }));
    }
  }, [nom, typeProduit]);

  const valider = useCallback((): CreerProduitDTO | null => {
    const variantes = variantesGenerees.filter((v) => v.sku && v.prixDetail > 0);
    if (variantes.length === 0) {
      setErreur("Renseignez au moins un SKU et un prix de détail");
      return null;
    }
    if (typeProduit === "MENU" && lignesRecette.length === 0) {
      setErreur("Ajoutez au moins un ingrédient à la recette du menu");
      return null;
    }

    const donnees: CreerProduitDTO = {
      nom,
      description: description || undefined,
      typeProduit,
      marque: marque || undefined,
      categorieId: categorieId || undefined,
      tauxTva: tauxTva ? Number(tauxTva) : undefined,
      images: images.length > 0 ? images : undefined,
      metadataSecteur: Object.keys(metadataSecteur).length > 0 ? metadataSecteur : undefined,
      cookingTimeMinutes: cookingTimeMinutes ?? undefined,
      prixPromotion: prixPromotion ?? undefined,
      enPromotion,
      niveauEpice: niveauEpice ?? undefined,
      tagsCuisine: tagsCuisine.length > 0 ? tagsCuisine : undefined,
      enRupture,
      modeDisponibilite,
      planningDisponibilite: modeDisponibilite === "PROGRAMME" ? planningDisponibilite : undefined,
      emplacementsDisponibles: emplacementsDisponibles.length > 0 ? emplacementsDisponibles : undefined,
      variantes,
    };

    const validation = creerProduitSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return null;
    }
    setErreur("");
    return validation.data;
  }, [
    nom, description, typeProduit, marque, categorieId, tauxTva,
    images, metadataSecteur, lignesRecette, variantesGenerees,
    cookingTimeMinutes, prixPromotion, enPromotion, niveauEpice, tagsCuisine,
    enRupture,
    modeDisponibilite, planningDisponibilite, emplacementsDisponibles,
  ]);

  return {
    valeurs: {
      nom, description, typeProduit, marque, categorieId, tauxTva,
      prefixeSku, axes, varianteUnique, variantesGenerees, images, metadataSecteur,
      lignesRecette, erreur,
      cookingTimeMinutes, prixPromotion, enPromotion, niveauEpice, tagsCuisine,
      enRupture,
      modeDisponibilite, planningDisponibilite, emplacementsDisponibles,
    },
    setNom, setDescription, setTypeProduit, setMarque, setCategorieId, setTauxTva,
    setPrefixeSku: setPrefixeSkuAvecTracking,
    setVarianteUnique: setVarianteUniqueAvecSkuTracking,
    setImages, setMetadataSecteur, setLignesRecette,
    setCookingTimeMinutes, setPrixPromotion, setEnPromotion,
    setNiveauEpice, setTagsCuisine, setEnRupture,
    setModeDisponibilite, setPlanningDisponibilite, setEmplacementsDisponibles,
    ajouterAxe, retirerAxe, modifierAxe,
    regenererSku,
    reinitialiser, valider, setErreur,
  };
}
