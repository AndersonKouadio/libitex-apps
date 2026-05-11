"use client";

import { Card } from "@heroui/react";
import { Trophy } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import type { IRapportZ } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  rapport: IRapportZ;
}

type Top = IRapportZ["topProduits"][number];

function TooltipTop({ active, payload }: { active?: boolean; payload?: Array<{ payload: Top }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-surface shadow-md px-3 py-2 text-xs">
      <p className="text-sm font-semibold text-foreground mb-1">{p.nomProduit}</p>
      <p className="text-foreground tabular-nums">
        <span className="font-semibold">{formatMontant(p.chiffreAffaires)}</span>
        <span className="text-muted text-xs ml-1">F · {p.quantite} vendus</span>
      </p>
    </div>
  );
}

export function RapportZTopProduits({ rapport }: Props) {
  const top = rapport.topProduits ?? [];
  if (top.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm flex items-center gap-1.5">
            <Trophy size={14} className="text-warning" />
            Top produits du jour
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-muted py-4">Aucun produit vendu ce jour-là.</p>
        </Card.Content>
      </Card>
    );
  }
  const hauteur = Math.max(80, top.length * 40);
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <Trophy size={14} className="text-warning" />
          Top {top.length} produit{top.length > 1 ? "s" : ""} du jour
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div style={{ height: hauteur }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 0 }} barCategoryGap={6}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nomProduit"
                axisLine={false}
                tickLine={false}
                width={110}
                tick={{ fontSize: 11, fill: "var(--foreground)" }}
              />
              <Tooltip content={<TooltipTop />} cursor={{ fill: "var(--accent)", fillOpacity: 0.08 }} />
              <Bar dataKey="chiffreAffaires" radius={[4, 4, 4, 4]} minPointSize={8}>
                {top.map((entry, index) => (
                  <Cell key={entry.variantId} fill={index === 0 ? "var(--accent)" : "color-mix(in oklch, var(--accent), transparent 50%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card.Content>
    </Card>
  );
}
