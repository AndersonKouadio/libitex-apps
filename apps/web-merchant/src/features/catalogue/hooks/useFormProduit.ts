"use client";

import { useState, useCallback } from "react";
import { creerProduitSchema, type CreerProduitDTO, type CreerVarianteDTO } from "../schemas/produit.schema";

const VARIANTE_VIDE: CreerVarianteDTO = { sku: "", prixDetail: 0 };

export interface EtatFormProduit {
  nom: string;
  description: string;
  typeProduit: string;
  marque: string;
  variantes: CreerVarianteDTO[];
  erreur: string;
}

export function useFormProduit() {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [typeProduit, setTypeProduit] = useState("SIMPLE");
  const [marque, setMarque] = useState("");
  const [variantes, setVariantes] = useState<CreerVarianteDTO[]>([{ ...VARIANTE_VIDE }]);
  const [erreur, setErreur] = useState("");

  const modifierVariante = useCallback((index: number, data: Partial<CreerVarianteDTO>) => {
    setVariantes((prev) => prev.map((v, i) => (i === index ? { ...v, ...data } : v)));
  }, []);

  const retirerVariante = useCallback((index: number) => {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const ajouterVariante = useCallback(() => {
    setVariantes((prev) => [...prev, { ...VARIANTE_VIDE }]);
  }, []);

  const reinitialiser = useCallback(() => {
    setNom("");
    setDescription("");
    setTypeProduit("SIMPLE");
    setMarque("");
    setVariantes([{ ...VARIANTE_VIDE }]);
    setErreur("");
  }, []);

  const valider = useCallback((): CreerProduitDTO | null => {
    const donnees: CreerProduitDTO = {
      nom,
      description: description || undefined,
      typeProduit: typeProduit as CreerProduitDTO["typeProduit"],
      marque: marque || undefined,
      variantes,
    };

    const validation = creerProduitSchema.safeParse(donnees);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Donnees invalides");
      return null;
    }
    setErreur("");
    return validation.data;
  }, [nom, description, typeProduit, marque, variantes]);

  return {
    valeurs: { nom, description, typeProduit, marque, variantes, erreur },
    setNom, setDescription, setTypeProduit, setMarque,
    modifierVariante, retirerVariante, ajouterVariante,
    reinitialiser, valider, setErreur,
  };
}
