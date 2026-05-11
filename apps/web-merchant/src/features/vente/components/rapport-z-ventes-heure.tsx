"use client";

import { Card } from "@heroui/react";
import { Clock } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import type { IRapportZ } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  rapport: IRapportZ;
}

type PointHeure = IRapportZ["ventesParHeure"][number];

function TooltipHeure({ active, payload }: { active?: boolean; payload?: Array<{ payload: PointHeure }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-surface shadow-md px-3 py-2 text-xs">
      <p className="text-muted">{String(p.heure).padStart(2, "0")}h — {String(p.heure + 1).padStart(2, "0")}h</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">
        {formatMontant(p.recettes)}<span className="text-xs font-normal text-muted ml-1">F</span>
      </p>
      <p className="text-xs text-muted tabular-nums">
        {p.nombre} ticket{p.nombre > 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function RapportZVentesHeure({ rapport }: Props) {
  const data = rapport.ventesParHeure ?? [];
  if (data.length === 0) {
    return null;
  }
  // Densifier l'axe : completer les 24 heures, vides a 0.
  const map = new Map(data.map((v) => [v.heure, v]));
  const points: PointHeure[] = [];
  for (let h = 0; h < 24; h += 1) {
    points.push(map.get(h) ?? { heure: h, recettes: 0, nombre: 0 });
  }
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <Clock size={14} className="text-accent" />
          Ventes par heure
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="gradHeure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="heure"
                axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                tickFormatter={(h: number) => `${String(h).padStart(2, "0")}h`}
                interval={2}
              />
              <YAxis
                axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
              />
              <Tooltip content={<TooltipHeure />} cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="recettes"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#gradHeure)"
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card.Content>
    </Card>
  );
}
