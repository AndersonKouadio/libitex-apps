"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card, Tabs, Select, ListBox, Label, Button, TextField, Input, Skeleton,
} from "@heroui/react";
import { ArrowLeft, ClipboardCheck, Package, Wheat, MapPin, AlertCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { useAppliquerInventaireMutation } from "@/features/stock/queries/inventaire.mutation";
import { TableInventaireVariantes } from "@/features/stock/components/table-inventaire-variantes";
import {
  useIngredientListQuery, useStockIngredientsQuery,
} from "@/features/ingredient/queries/ingredient-list.query";
import { useAppliquerInventaireIngredientsMutation } from "@/features/ingredient/queries/inventaire-ingredients.mutation";
import { TableInventaireIngredients } from "@/features/ingredient/components/table-inventaire-ingredients";
import { fusionnerStockIngredients } from "@/features/ingredient/utils/calcul-kpi";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useRouter } from "next/navigation";

type Onglet = "variantes" | "ingredients";

const DATE_AUJOURDHUI = new Date().toLocaleDateString("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

export default function PageInventaire() {
  const router = useRouter();
  const { data: boutique } = useBoutiqueActiveQuery();
  const { data: emplacements } = useEmplacementListQuery();
  const [emplacementId, setEmplacementId] = useState("");
  const [onglet, setOnglet] = useState<Onglet>("variantes");
  const [justification, setJustification] = useState(`Inventaire ${DATE_AUJOURDHUI}`);

  // Comptages : Map<varianteId|ingredientId, quantiteReelle>
  const [comptagesVar, setComptagesVar] = useState<Map<string, number>>(new Map());
  const [comptagesIng, setComptagesIng] = useState<Map<string, number>>(new Map());

  const { data: stockVariantes, isLoading: chargementVar } =
    useStockEmplacementQuery(emplacementId || undefined);
  const { data: ingredients } = useIngredientListQuery();
  const { data: stockIng } = useStockIngredientsQuery(emplacementId || undefined);
  const lignesIng = useMemo(
    () => fusionnerStockIngredients(ingredients ?? [], stockIng ?? []),
    [ingredients, stockIng],
  );

  const mutationVar = useAppliquerInventaireMutation();
  const mutationIng = useAppliquerInventaireIngredientsMutation();

  const secteur = boutique?.secteurActivite;
  const ingredientsDispo = secteur === "RESTAURATION" || secteur === "AUTRE";

  const recapVar = useMemo(() => recapDeltas(comptagesVar, stockVariantes ?? [], "varianteId"), [comptagesVar, stockVariantes]);
  const recapIng = useMemo(() => recapDeltas(
    comptagesIng,
    lignesIng.map((l) => ({ id: l.ingredient.id, quantite: l.quantite })),
    "id",
  ), [comptagesIng, lignesIng]);

  function changerEmplacement(id: string) {
    setEmplacementId(id);
    setComptagesVar(new Map());
    setComptagesIng(new Map());
  }

  async function valider() {
    if (!emplacementId) return;
    if (onglet === "variantes") {
      const lignes = Array.from(comptagesVar.entries()).map(([varianteId, quantiteReelle]) => ({
        varianteId, quantiteReelle,
      }));
      if (lignes.length === 0) return;
      await mutationVar.mutateAsync({ emplacementId, justification, lignes });
      router.push("/stock");
    } else {
      const lignes = Array.from(comptagesIng.entries()).map(([ingredientId, quantiteReelle]) => ({
        ingredientId, quantiteReelle,
      }));
      if (lignes.length === 0) return;
      await mutationIng.mutateAsync({ emplacementId, justification, lignes });
      router.push("/stock");
    }
  }

  const recap = onglet === "variantes" ? recapVar : recapIng;
  const aLignes = onglet === "variantes" ? comptagesVar.size > 0 : comptagesIng.size > 0;
  const enCours = onglet === "variantes" ? mutationVar.isPending : mutationIng.isPending;

  return (
    <PageContainer>
      <PageHeader
        titre="Inventaire complet"
        description="Comptez physiquement votre stock et validez en lot. Les lignes vides sont ignorées."
        actions={
          <Link href="/stock">
            <Button variant="ghost" className="gap-1.5 text-xs">
              <ArrowLeft size={14} />
              Retour au stock
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <Card.Content className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <Select
            isRequired
            selectedKey={emplacementId}
            onSelectionChange={(k) => changerEmplacement(String(k))}
          >
            <Label>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} /> Emplacement à inventorier
              </span>
            </Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(emplacements ?? []).map((e) => (
                  <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <TextField value={justification} onChange={setJustification} isRequired>
            <Label>Justification</Label>
            <Input placeholder={`Inventaire ${DATE_AUJOURDHUI}`} />
          </TextField>
        </Card.Content>
      </Card>

      {!emplacementId ? (
        <Card>
          <Card.Content className="py-16 text-center">
            <ClipboardCheck size={28} className="text-muted/30 mx-auto mb-3" />
            <p className="text-sm text-foreground">Sélectionnez un emplacement pour commencer</p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Tabs selectedKey={onglet} onSelectionChange={(k) => setOnglet(k as Onglet)} aria-label="Type d'inventaire">
            <Tabs.List>
              <Tabs.Tab id="variantes" className="px-4 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <Package size={14} />
                  Produits
                </span>
              </Tabs.Tab>
              {ingredientsDispo && (
                <Tabs.Tab id="ingredients" className="px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Wheat size={14} />
                    Ingrédients
                  </span>
                </Tabs.Tab>
              )}
            </Tabs.List>
          </Tabs>

          <Recap recap={recap} />

          <div className="mt-3">
            {onglet === "variantes" ? (
              chargementVar ? <SkeletonLignes /> : (
                <TableInventaireVariantes
                  rows={stockVariantes ?? []}
                  comptage={{ comptages: comptagesVar, setComptages: setComptagesVar }}
                />
              )
            ) : (
              <TableInventaireIngredients
                lignes={lignesIng}
                comptage={{ comptages: comptagesIng, setComptages: setComptagesIng }}
              />
            )}
          </div>

          <BarreValidation
            justification={justification}
            aLignes={aLignes}
            recap={recap}
            enCours={enCours}
            onValider={valider}
          />
        </>
      )}
    </PageContainer>
  );
}

interface Recap {
  comptees: number;
  ajustements: number;
  inchanges: number;
  ajouts: number;
  retraits: number;
}

function recapDeltas<T extends { quantite: number }>(
  comptages: Map<string, number>,
  rows: Array<T & { [k: string]: any }>,
  idKey: string,
): Recap {
  let ajustements = 0; let inchanges = 0; let ajouts = 0; let retraits = 0;
  for (const r of rows) {
    const id = (r as any)[idKey] as string;
    if (!comptages.has(id)) continue;
    const reelle = comptages.get(id)!;
    const delta = reelle - r.quantite;
    if (Math.abs(delta) < 0.0005) inchanges += 1;
    else {
      ajustements += 1;
      if (delta > 0) ajouts += 1;
      else retraits += 1;
    }
  }
  return { comptees: comptages.size, ajustements, inchanges, ajouts, retraits };
}

function Recap({ recap }: { recap: Recap }) {
  if (recap.comptees === 0) return null;
  return (
    <div className="mt-3 mb-3 px-3 py-2.5 rounded-lg bg-surface-secondary/50 text-xs flex flex-wrap gap-x-4 gap-y-1">
      <span className="text-foreground">
        <strong className="tabular-nums">{recap.comptees}</strong> ligne{recap.comptees > 1 ? "s" : ""} comptée{recap.comptees > 1 ? "s" : ""}
      </span>
      <span className="text-muted">
        <strong className="tabular-nums text-foreground">{recap.inchanges}</strong> sans écart
      </span>
      <span className="text-warning">
        <strong className="tabular-nums">{recap.ajustements}</strong> ajustement{recap.ajustements > 1 ? "s" : ""}
        {recap.ajustements > 0 && ` (+${recap.ajouts} / -${recap.retraits})`}
      </span>
    </div>
  );
}

function BarreValidation({
  justification, aLignes, recap, enCours, onValider,
}: {
  justification: string; aLignes: boolean; recap: Recap;
  enCours: boolean; onValider: () => void;
}) {
  return (
    <div className="mt-6 sticky bottom-4 bg-surface border border-border rounded-xl p-4 shadow-md flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-muted flex items-start gap-2 max-w-md">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        Lignes vides ignorées. Pour mettre une référence à 0, saisis explicitement <strong>0</strong>.
      </div>
      <Button
        variant="primary"
        onPress={onValider}
        isDisabled={!aLignes || !justification.trim() || enCours || recap.ajustements === 0}
        className="gap-1.5"
      >
        <ClipboardCheck size={16} />
        {enCours ? "Validation en cours…"
          : recap.ajustements > 0
            ? `Valider ${recap.ajustements} ajustement${recap.ajustements > 1 ? "s" : ""}`
            : "Aucun ajustement"}
      </Button>
    </div>
  );
}

function SkeletonLignes() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
    </div>
  );
}
