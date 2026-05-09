"use client";

import { useState } from "react";
import {
  Disclosure, DisclosureGroup,
  TextField, Label, Input, Button, Switch, Chip,
} from "@heroui/react";
import { ChevronDown, Save } from "lucide-react";
import type { IVariante } from "../types/produit.type";
import type { ModifierVarianteDTO } from "../schemas/produit.schema";
import { useModifierVarianteMutation } from "../queries/variante-update.mutation";

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

  return (
    <Disclosure>
      <Disclosure.Heading>
        <Disclosure.Trigger className="group flex items-center w-full px-4 py-3 gap-3 hover:bg-surface-secondary/40 transition-colors">
          <ChevronDown size={14} className="text-muted shrink-0 transition-transform group-data-[expanded]:rotate-180" />
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground truncate">{titre}</span>
            <span className="text-xs font-mono text-muted truncate">{variante.sku}</span>
          </div>
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
            <Label>Prix d'achat</Label><Input placeholder="9 500" min="0" />
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
