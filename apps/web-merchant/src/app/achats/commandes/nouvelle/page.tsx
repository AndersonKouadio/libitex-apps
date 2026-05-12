"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button, TextField, Label, Input, FieldError, TextArea,
  Select, ListBox, Card, toast, Spinner,
} from "@heroui/react";
import { ArrowLeft, Trash2, Plus, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useFournisseurListQuery, useCreerCommandeMutation } from "@/features/achat/queries/achat.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { formatMontant } from "@/features/vente/utils/format";

interface Ligne {
  varianteId: string;
  produitId: string;
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  quantite: number;
  prixUnitaire: number;
}

export default function PageNouvelleCommande() {
  const router = useRouter();
  const { data: fournisseurs } = useFournisseurListQuery();
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
  const [lignes, setLignes] = useState<Ligne[]>([]);

  const produits = produitsData?.data ?? [];

  // Liste plate { produit, variante } filtree par recherche, exclut MENU
  // (les menus n'ont pas de cout d'achat propre, ce sont les ingredients
  // qui s'achetent).
  const variantesDispo = useMemo(() => {
    const flat: Array<{ produitId: string; varianteId: string; nomProduit: string; nomVariante: string | null; sku: string; prixAchat: number }> = [];
    for (const p of produits) {
      if (p.typeProduit === "MENU") continue;
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

  function ajouterLigne(v: typeof variantesDispo[number]) {
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

  /** Fix I4 : parse robuste — un input vide donne 0 au lieu de NaN. */
  function parseNum(brut: string): number {
    const n = Number(brut);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function modifierQuantite(idx: number, brut: string) {
    const qte = parseNum(brut);
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, quantite: qte } : l)));
  }
  function modifierPrix(idx: number, brut: string) {
    const prix = parseNum(brut);
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, prixUnitaire: prix } : l)));
  }
  function retirerLigne(idx: number) {
    setLignes((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  async function valider() {
    if (!fournisseurId) { toast.danger("Choisissez un fournisseur"); return; }
    if (!emplacementId) { toast.danger("Choisissez un emplacement de livraison"); return; }
    if (lignes.length === 0) { toast.danger("Ajoutez au moins une ligne"); return; }
    const valides = lignes.filter((l) => l.quantite > 0);
    if (valides.length === 0) { toast.danger("Toutes les quantites sont a 0"); return; }
    try {
      const commande = await creer.mutateAsync({
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
        <Card className="lg:col-span-1">
          <Card.Content className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Informations</p>
            <Select
              selectedKey={fournisseurId || undefined}
              onSelectionChange={(k) => setFournisseurId(String(k))}
              aria-label="Fournisseur"
            >
              <Label>Fournisseur</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(fournisseurs ?? []).map((f) => (
                    <ListBox.Item key={f.id} id={f.id} textValue={f.nom}>{f.nom}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              selectedKey={emplacementId || undefined}
              onSelectionChange={(k) => setEmplacementId(String(k))}
              aria-label="Emplacement de livraison"
            >
              <Label>Emplacement de livraison</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(emplacements ?? []).map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <TextField value={dateAttendue} onChange={setDateAttendue}>
              <Label>Date de livraison attendue</Label>
              <Input type="date" />
            </TextField>
            <TextField value={notes} onChange={setNotes}>
              <Label>Notes</Label>
              <TextArea rows={2} placeholder="Reference du fournisseur, instructions..." />
            </TextField>
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Content className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Lignes ({lignes.length})
              </p>
              <p className="text-sm font-bold tabular-nums">
                Total : {formatMontant(total)} F
              </p>
            </div>

            {lignes.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">
                Aucune ligne. Recherchez un produit ci-dessous pour ajouter.
              </p>
            ) : (
              <div className="space-y-2">
                {lignes.map((l, i) => (
                  <div key={`${l.varianteId}-${i}`} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.nomProduit}</p>
                      <p className="text-xs text-muted truncate">
                        {l.nomVariante ? `${l.nomVariante} · ` : ""}{l.sku}
                      </p>
                    </div>
                    <input
                      type="number"
                      value={Number.isFinite(l.quantite) ? l.quantite : 0}
                      onChange={(e) => modifierQuantite(i, e.target.value)}
                      min={0}
                      step="0.001"
                      aria-label="Quantite"
                      className="w-20 h-9 px-2 text-sm text-right tabular-nums rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <input
                      type="number"
                      value={Number.isFinite(l.prixUnitaire) ? l.prixUnitaire : 0}
                      onChange={(e) => modifierPrix(i, e.target.value)}
                      min={0}
                      step="1"
                      aria-label="Prix unitaire"
                      className="w-24 h-9 px-2 text-sm text-right tabular-nums rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <span className="w-24 text-right text-sm font-semibold tabular-nums shrink-0">
                      {formatMontant(l.quantite * l.prixUnitaire)} F
                    </span>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 min-w-0 text-danger"
                      aria-label="Retirer"
                      onPress={() => retirerLigne(i)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted mb-2">Ajouter un produit</p>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher par nom, variante ou SKU"
                  className="w-full h-9 pl-7 pr-2 text-sm rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              {chargementProduits ? (
                <Spinner />
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {variantesDispo.length === 0 ? (
                    <p className="text-xs text-muted text-center py-3">Aucun resultat</p>
                  ) : (
                    variantesDispo.map((v) => (
                      <button
                        key={v.varianteId}
                        type="button"
                        onClick={() => ajouterLigne(v)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left rounded hover:bg-surface-secondary"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">{v.nomProduit}</span>
                          <span className="text-xs text-muted block truncate">
                            {v.nomVariante ? `${v.nomVariante} · ` : ""}{v.sku}
                          </span>
                        </span>
                        <span className="text-xs text-muted tabular-nums shrink-0">
                          {formatMontant(v.prixAchat)} F
                        </span>
                        <Plus size={14} className="text-accent shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card.Content>
        </Card>
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
