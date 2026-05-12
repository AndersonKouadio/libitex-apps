"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useFournisseurListQuery, useCreerCommandeMutation } from "@/features/achat/queries/achat.query";
import { commandeSchema } from "@/features/achat/schemas/achat.schema";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { FormulaireInfosCommande } from "@/features/achat/components/formulaire-infos-commande";
import {
  LignesCommandeEdition,
  type LigneEdition,
  type VarianteDispo,
} from "@/features/achat/components/lignes-commande-edition";

/** Types de produits a stock (commandables aupres d'un fournisseur).
 *  MENU est exclu : les recettes ne s'achetent pas, ce sont leurs
 *  ingredients qui sont commandes. */
const TYPES_AVEC_STOCK = new Set(["SIMPLE", "VARIANT", "SERIALIZED", "PERISHABLE"]);

export default function PageNouvelleCommande() {
  const router = useRouter();
  // Fix I3 : on ne propose que les fournisseurs actifs.
  const { data: fournisseurs } = useFournisseurListQuery(undefined, { actifsSeulement: true });
  const { data: emplacements } = useEmplacementListQuery();
  const { data: produitsData, isLoading: chargementProduits } = useProduitListQuery(
    1, undefined, { isSupplement: null, actif: true },
  );
  const creer = useCreerCommandeMutation();

  const [fournisseurId, setFournisseurId] = useState("");
  const [emplacementId, setEmplacementId] = useState("");
  const [dateAttendue, setDateAttendue] = useState("");
  const [notes, setNotes] = useState("");
  const [recherche, setRecherche] = useState("");
  const [lignes, setLignes] = useState<LigneEdition[]>([]);

  const produits = produitsData?.data ?? [];

  /** Liste plate des variantes commandables, filtrees par recherche. */
  const variantesDispo = useMemo<VarianteDispo[]>(() => {
    const flat: VarianteDispo[] = [];
    for (const p of produits) {
      if (!TYPES_AVEC_STOCK.has(p.typeProduit)) continue;
      for (const v of p.variantes) {
        flat.push({
          produitId: p.id,
          varianteId: v.id,
          nomProduit: p.nom,
          nomVariante: v.nom,
          sku: v.sku,
          prixAchat: v.prixAchat ?? 0,
        });
      }
    }
    if (!recherche) return flat.slice(0, 30);
    const q = recherche.toLowerCase();
    return flat.filter((v) =>
      v.nomProduit.toLowerCase().includes(q)
      || (v.nomVariante ?? "").toLowerCase().includes(q)
      || v.sku.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [produits, recherche]);

  function ajouterLigne(v: VarianteDispo) {
    setLignes((prev) => {
      const exist = prev.find((l) => l.varianteId === v.varianteId);
      if (exist) {
        return prev.map((l) =>
          l.varianteId === v.varianteId ? { ...l, quantite: l.quantite + 1 } : l,
        );
      }
      return [...prev, {
        varianteId: v.varianteId,
        produitId: v.produitId,
        nomProduit: v.nomProduit,
        nomVariante: v.nomVariante,
        sku: v.sku,
        quantite: 1,
        prixUnitaire: v.prixAchat,
      }];
    });
  }

  function modifierQuantite(idx: number, qte: number) {
    const val = Number.isFinite(qte) && qte >= 0 ? qte : 0;
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, quantite: val } : l)));
  }
  function modifierPrix(idx: number, prix: number) {
    const val = Number.isFinite(prix) && prix >= 0 ? prix : 0;
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, prixUnitaire: val } : l)));
  }
  function retirerLigne(idx: number) {
    setLignes((prev) => prev.filter((_, i) => i !== idx));
  }

  async function valider() {
    if (!fournisseurId) { toast.danger("Choisissez un fournisseur"); return; }
    if (!emplacementId) { toast.danger("Choisissez un emplacement de livraison"); return; }
    if (lignes.length === 0) { toast.danger("Ajoutez au moins une ligne"); return; }
    const valides = lignes.filter((l) => l.quantite > 0);
    if (valides.length === 0) { toast.danger("Toutes les quantites sont a 0"); return; }

    // Fix m5 + m6 : validation Zod complete (dateAttendue >= today,
    // notes <= 500 chars).
    const parsed = commandeSchema.safeParse({
      fournisseurId,
      emplacementId,
      dateAttendue: dateAttendue || undefined,
      notes: notes || undefined,
      lignes: valides.map((l) => ({
        varianteId: l.varianteId,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
      })),
    });
    if (!parsed.success) {
      toast.danger(parsed.error.issues[0]?.message ?? "Donnees invalides");
      return;
    }

    try {
      const commande = await creer.mutateAsync(parsed.data);
      router.push(`/achats/commandes/${commande.id}`);
    } catch {
      // toast deja affiche par la mutation
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Nouvelle commande"
        description="Creer un bon de commande fournisseur. Les receptions alimenteront le stock automatiquement."
        actions={
          <Button variant="ghost" className="gap-2" onPress={() => router.back()}>
            <ArrowLeft size={16} /> Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FormulaireInfosCommande
          fournisseurs={fournisseurs ?? []}
          emplacements={emplacements ?? []}
          fournisseurId={fournisseurId}
          emplacementId={emplacementId}
          dateAttendue={dateAttendue}
          notes={notes}
          onFournisseur={setFournisseurId}
          onEmplacement={setEmplacementId}
          onDate={setDateAttendue}
          onNotes={setNotes}
        />
        <LignesCommandeEdition
          lignes={lignes}
          recherche={recherche}
          variantesDispo={variantesDispo}
          chargementProduits={chargementProduits}
          onAjouter={ajouterLigne}
          onQuantite={modifierQuantite}
          onPrix={modifierPrix}
          onRetirer={retirerLigne}
          onRecherche={setRecherche}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onPress={() => router.back()}>Annuler</Button>
        <Button variant="primary" onPress={valider} isDisabled={creer.isPending}>
          {creer.isPending ? "Creation..." : "Creer la commande"}
        </Button>
      </div>
    </PageContainer>
  );
}
