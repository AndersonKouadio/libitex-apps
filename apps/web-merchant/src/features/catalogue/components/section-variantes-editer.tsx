"use client";

import { useState } from "react";
import {
  Disclosure, DisclosureGroup,
  TextField, Label, Input, Description, Button, Switch, Chip, Tooltip,
} from "@heroui/react";
import { ChevronDown, Save, Info, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import type { IVariante } from "../types/produit.type";
import type { ModifierVarianteDTO } from "../schemas/produit.schema";
import { useModifierVarianteMutation } from "../queries/variante-update.mutation";
import {
  calculerMargeReelle,
  classesMarge,
  libelleMarge,
} from "../utils/marge";

interface Props {
  produitId: string;
  variantes: IVariante[];
}

const formatPrix = (n: number | null) =>
  n == null ? "--" : new Intl.NumberFormat("fr-FR").format(n);

export function SectionVariantesEditer({ produitId, variantes }: Props) {
  if (variantes.length === 0) {
    return <p className="text-sm text-muted">Aucune variante n'est rattachée à ce produit.</p>;
  }
  return (
    <DisclosureGroup className="rounded-lg border border-border divide-y divide-border bg-surface">
      {variantes.map((v) => (
        <LigneVarianteEditer key={v.id} produitId={produitId} variante={v} />
      ))}
    </DisclosureGroup>
  );
}

function LigneVarianteEditer({
  produitId, variante,
}: { produitId: string; variante: IVariante }) {
  const [etat, setEtat] = useState({
    sku: variante.sku,
    codeBarres: variante.codeBarres ?? "",
    prixAchat: variante.prixAchat ? String(variante.prixAchat) : "",
    prixDetail: String(variante.prixDetail),
    prixGros: variante.prixGros ? String(variante.prixGros) : "",
    prixVip: variante.prixVip ? String(variante.prixVip) : "",
  });
  const set = (k: keyof typeof etat) => (v: string) => setEtat((s) => ({ ...s, [k]: v }));
  const mutation = useModifierVarianteMutation(produitId);

  const dirty =
    etat.sku !== variante.sku
    || etat.codeBarres !== (variante.codeBarres ?? "")
    || etat.prixAchat !== (variante.prixAchat ? String(variante.prixAchat) : "")
    || etat.prixDetail !== String(variante.prixDetail)
    || etat.prixGros !== (variante.prixGros ? String(variante.prixGros) : "")
    || etat.prixVip !== (variante.prixVip ? String(variante.prixVip) : "");

  function enregistrer() {
    const data: ModifierVarianteDTO = {
      sku: etat.sku,
      codeBarres: etat.codeBarres || undefined,
      prixAchat: etat.prixAchat ? Number(etat.prixAchat) : undefined,
      prixDetail: Number(etat.prixDetail),
      prixGros: etat.prixGros ? Number(etat.prixGros) : undefined,
      prixVip: etat.prixVip ? Number(etat.prixVip) : undefined,
    };
    mutation.mutate({ varianteId: variante.id, data });
  }

  const titre = Object.values(variante.attributs ?? {}).join(" / ")
    || variante.nom || "Variante unique";

  // Phase A.4 : marge reelle = (prix_vente - CUMP) / CUMP
  const marge = calculerMargeReelle(
    variante.prixDetail,
    variante.cump ?? 0,
    variante.prixAchat,
  );

  return (
    <Disclosure>
      <Disclosure.Heading>
        <Disclosure.Trigger className="group flex items-center w-full px-4 py-3 gap-3 hover:bg-surface-secondary/40 transition-colors">
          <ChevronDown size={14} className="text-muted shrink-0 transition-transform group-data-[expanded]:rotate-180" />
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground truncate">{titre}</span>
            <span className="text-xs font-mono text-muted truncate">{variante.sku}</span>
          </div>
          {/* Phase A.4 : badge marge reelle a cote du prix */}
          {marge.pourcentage !== null && (
            <Chip
              variant="soft"
              size="sm"
              className={`shrink-0 text-xs gap-1 ${
                marge.enPerte
                  ? "bg-danger/10 text-danger"
                  : marge.pourcentage < 10
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
              }`}
            >
              {marge.enPerte ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {libelleMarge(marge)}
            </Chip>
          )}
          <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
            {formatPrix(variante.prixDetail)} F
          </span>
          <Chip className="text-xs shrink-0 bg-success/10 text-success">Actif</Chip>
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content className="px-4 pb-4 pt-1 space-y-3 bg-surface-secondary/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField value={etat.sku} onChange={set("sku")}>
            <Label>SKU / Référence</Label><Input />
          </TextField>
          <TextField value={etat.codeBarres} onChange={set("codeBarres")}>
            <Label>Code-barres (optionnel)</Label><Input placeholder="3017620422003" />
          </TextField>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TextField type="number" value={etat.prixAchat} onChange={set("prixAchat")}>
            <Label>Prix d'achat estimé</Label>
            <Input placeholder="9 500" min="0" />
            <Description className="text-[10px]">
              Affiné à la réception (voir CUMP ci-dessous)
            </Description>
          </TextField>
          <TextField isRequired type="number" value={etat.prixDetail} onChange={set("prixDetail")}>
            <Label>Prix détail</Label><Input placeholder="15 000" min="0" />
          </TextField>
          <TextField type="number" value={etat.prixGros} onChange={set("prixGros")}>
            <Label>Prix gros</Label><Input placeholder="12 000" min="0" />
          </TextField>
          <TextField type="number" value={etat.prixVip} onChange={set("prixVip")}>
            <Label>Prix VIP</Label><Input placeholder="11 000" min="0" />
          </TextField>
        </div>

        {/* Phase A.4 : bloc CUMP + marge reelle (lecture seule) */}
        <BlocCumpMarge variante={variante} marge={marge} />

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            variant="primary"
            className="gap-1.5"
            onPress={enregistrer}
            isDisabled={!dirty || mutation.isPending}
          >
            <Save size={14} />
            {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
}

/**
 * Phase A.4 : bloc d'affichage du CUMP + marge reelle.
 * - CUMP = cout debarque moyen (incluant frais d'approche)
 * - Marge reelle = (prix_vente - CUMP) / CUMP
 *
 * Si CUMP = 0 (jamais receptionne), on affiche le prix d'achat avec
 * une note explicative.
 */
function BlocCumpMarge({
  variante,
  marge,
}: {
  variante: IVariante;
  marge: ReturnType<typeof calculerMargeReelle>;
}) {
  const cumpInitialise = (variante.cump ?? 0) > 0;
  const dateMaj = variante.cumpMajLe
    ? new Date(variante.cumpMajLe).toLocaleDateString("fr-FR")
    : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-foreground">Cout reel & marge</h3>
        <Tooltip>
          <Tooltip.Trigger className="text-muted hover:text-foreground">
            <Info size={12} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            Le CUMP (Cout Unitaire Moyen Pondere) inclut le prix d&apos;achat
            ET les frais d&apos;approche (transport, douane, transit...).
            Il est recalcule a chaque reception.
          </Tooltip.Content>
        </Tooltip>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted">Prix d&apos;achat</p>
          <p className="font-medium tabular-nums">{formatPrix(variante.prixAchat)} F</p>
        </div>
        <div>
          <p className="text-xs text-muted flex items-center gap-1">
            CUMP (cout debarque)
          </p>
          <p className="font-semibold tabular-nums">
            {cumpInitialise ? `${formatPrix(variante.cump)} F` : "—"}
          </p>
          {dateMaj && (
            <p className="text-xs text-muted">MAJ {dateMaj}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted">Prix detail</p>
          <p className="font-medium tabular-nums">{formatPrix(variante.prixDetail)} F</p>
        </div>
        <div>
          <p className="text-xs text-muted">Marge reelle</p>
          <p className={`font-semibold tabular-nums ${classesMarge(marge)}`}>
            {libelleMarge(marge)}
            {marge.montant !== null && (
              <span className="text-xs font-normal ml-1">
                ({formatPrix(marge.montant)} F)
              </span>
            )}
          </p>
        </div>
      </div>

      {!cumpInitialise && (
        <p className="text-xs text-muted">
          CUMP non initialise. La marge est calculee sur le prix d&apos;achat
          (sans frais d&apos;approche). Receptionnez une commande avec frais
          pour activer le calcul reel.
        </p>
      )}
      {cumpInitialise && marge.enPerte && (
        <p className="text-xs text-danger font-medium flex items-center gap-1">
          <AlertTriangle size={12} />
          Vente a perte : le prix detail est inferieur au cout debarque.
        </p>
      )}
    </div>
  );
}
