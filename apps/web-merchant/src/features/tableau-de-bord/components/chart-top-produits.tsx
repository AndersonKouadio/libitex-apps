"use client";

import { useState } from "react";
import { Card, Skeleton, Button } from "@heroui/react";
import { Trophy, Package, X } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import type { ITopProduit } from "../types/dashboard.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  donnees: ITopProduit[] | undefined;
  enChargement: boolean;
  jours: number;
}

function TooltipTopProduits({ active, payload }: { active?: boolean; payload?: Array<{ payload: ITopProduit }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-surface shadow-md px-3 py-2 text-xs max-w-xs">
      <p className="text-sm font-semibold text-foreground mb-1">{p.nomProduit}</p>
      <p className="text-xs font-mono text-muted mb-1.5">{p.sku}</p>
      <p className="text-foreground tabular-nums">
        <span className="font-semibold">{formatMontant(p.chiffreAffaires)}</span>
        <span className="text-muted text-xs ml-1">F</span>
      </p>
      <p className="text-muted tabular-nums mt-0.5">
        {p.quantiteTotale} vendus · {p.nombreVentes} ventes
      </p>
    </div>
  );
}

export function ChartTopProduits({ donnees, enChargement, jours }: Props) {
  const [selectionne, setSelectionne] = useState<ITopProduit | null>(null);

  if (enChargement) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Top produits — {jours} jours</Card.Title>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-60 w-full rounded-lg" />
        </Card.Content>
      </Card>
    );
  }

  const top = (donnees ?? []).slice(0, 10);
  if (top.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Top produits — {jours} jours</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="h-60 flex flex-col items-center justify-center text-muted">
            <Trophy size={20} className="mb-1.5" />
            <span className="text-sm">Aucune vente sur la période</span>
          </div>
        </Card.Content>
      </Card>
    );
  }

  const hauteur = Math.max(60, top.length * 36);

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <Trophy size={14} className="text-warning" />
          Top {top.length} produits — {jours} jours
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div style={{ height: hauteur }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              barCategoryGap={6}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nomProduit"
                axisLine={false}
                tickLine={false}
                width={110}
                tick={{ fontSize: 11, fill: "var(--foreground)" }}
              />
              <Tooltip content={<TooltipTopProduits />} cursor={{ fill: "var(--accent)", fillOpacity: 0.08 }} />
              <Bar
                dataKey="chiffreAffaires"
                radius={[4, 4, 4, 4]}
                onClick={(payload) => setSelectionne(payload as unknown as ITopProduit)}
                cursor="pointer"
              >
                {top.map((entry, index) => (
                  <Cell key={entry.variantId} fill={index === 0 ? "var(--accent)" : "color-mix(in oklch, var(--accent), transparent 50%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {selectionne && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-start gap-2 mb-2">
              <Package size={16} className="text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{selectionne.nomProduit}</p>
                {selectionne.nomVariante && (
                  <p className="text-xs text-muted">{selectionne.nomVariante}</p>
                )}
                <p className="text-xs font-mono text-muted">{selectionne.sku}</p>
              </div>
              <Button
                variant="ghost" className="p-1 h-auto min-w-0"
                onPress={() => setSelectionne(null)}
                aria-label="Fermer le détail"
              >
                <X size={14} />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">CA</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMontant(selectionne.chiffreAffaires)}
                  <span className="text-xs font-normal text-muted ml-0.5">F</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Vendus</p>
                <p className="text-sm font-semibold tabular-nums">{selectionne.quantiteTotale}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Ventes</p>
                <p className="text-sm font-semibold tabular-nums">{selectionne.nombreVentes}</p>
              </div>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
