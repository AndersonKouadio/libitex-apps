"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { creerProduitSchema, type CreerProduitDTO, type CreerVarianteDTO } from "../schemas/produit.schema";
import { genererVariantesParCombinaison, type AxeAttribut } from "../utils/generer-variantes";

const VARIANTE_VIDE: CreerVarianteDTO = { sku: "", prixDetail: 0 };

export type TypeProduit = "SIMPLE" | "VARIANT" | "SERIALIZED" | "PERISHABLE";

export interface EtatFormProduit {
  nom: string;
  description: string;
  typeProduit: TypeProduit;
  marque: string;
  categorieId: string;
  codeBarresEan13: string;
  tauxTva: string;
  prefixeSku: string;
  axes: AxeAttribut[];
  varianteUnique: CreerVarianteDTO;
  erreur: string;
}

const AXES_VIDES: AxeAttribut[] = [{ nom: "", valeurs: [] }];

export function useFormProduit(typesAutorises: TypeProduit[] = ["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE"]) {
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
  const [codeBarresEan13, setCodeBarresEan13] = useState("");
  const [tauxTva, setTauxTva] = useState("0");
  const [prefixeSku, setPrefixeSku] = useState("");
  const [axes, setAxes] = useState<AxeAttribut[]>(AXES_VIDES);
  const [varianteUnique, setVarianteUnique] = useState<CreerVarianteDTO>({ ...VARIANTE_VIDE });
  const [images, setImages] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");

  const variantesGenerees = useMemo(() => {
    if (typeProduit === "VARIANT") {
      return genererVariantesParCombinaison(axes, prefixeSku, varianteUnique.prixDetail);
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
    setCategorieId(""); setCodeBarresEan13(""); setTauxTva("0"); setPrefixeSku("");
    setAxes(AXES_VIDES); setVarianteUnique({ ...VARIANTE_VIDE }); setImages([]); setErreur("");
  }, [typeParDefaut]);

  const valider = useCallback((): CreerProduitDTO | null => {
    const variantes = variantesGenerees.filter((v) => v.sku && v.prixDetail > 0);
    if (variantes.length === 0) {
      setErreur("Renseignez au moins un SKU et un prix de détail");
      return null;
    }

    const donnees: CreerProduitDTO = {
      nom,
      description: description || undefined,
      typeProduit,
      marque: marque || undefined,
      categorieId: categorieId || undefined,
      codeBarresEan13: codeBarresEan13 || undefined,
      tauxTva: tauxTva ? Number(tauxTva) : undefined,
      images: images.length > 0 ? images : undefined,
      variantes,
    };

    const validation = creerProduitSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return null;
    }
    setErreur("");
    return validation.data;
  }, [nom, description, typeProduit, marque, categorieId, codeBarresEan13, tauxTva, images, variantesGenerees]);

  return {
    valeurs: {
      nom, description, typeProduit, marque, categorieId, codeBarresEan13, tauxTva,
      prefixeSku, axes, varianteUnique, variantesGenerees, images, erreur,
    },
    setNom, setDescription, setTypeProduit, setMarque, setCategorieId,
    setCodeBarresEan13, setTauxTva, setPrefixeSku, setVarianteUnique, setImages,
    ajouterAxe, retirerAxe, modifierAxe,
    reinitialiser, valider, setErreur,
  };
}
