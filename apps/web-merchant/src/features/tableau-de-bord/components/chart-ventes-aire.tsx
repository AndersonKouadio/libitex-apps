"use client";

import { Card, Skeleton } from "@heroui/react";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import type { IPointVentesJour } from "../types/dashboard.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  donnees: IPointVentesJour[] | undefined;
  enChargement: boolean;
  jours: number;
}

const FORMAT_JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit" });
const FORMAT_JOUR_LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "2-digit", month: "long",
});

function dateIso(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

/**
 * Re-genere la serie complete (zero-fill les jours sans vente) pour que
 * la courbe affiche tous les jours de la periode, meme sans vente.
 */
function genererSerieComplete(donnees: IPointVentesJour[], jours: number): IPointVentesJour[] {
  const map = new Map(donnees.map((p) => [p.date, p]));
  const resultat: IPointVentesJour[] = [];
  for (let i = jours - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = dateIso(d);
    resultat.push(map.get(iso) ?? { date: iso, recettes: 0, nombre: 0 });
  }
  return resultat;
}

function TooltipVentes({ active, payload }: { active?: boolean; payload?: Array<{ payload: IPointVentesJour }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const dateLong = FORMAT_JOUR_LONG.format(new Date(p.date));
  return (
    <div className="rounded-lg border border-border bg-surface shadow-md px-3 py-2 text-xs">
      <p className="text-muted capitalize mb-1">{dateLong}</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">
        {formatMontant(p.recettes)} <span className="text-xs font-normal text-muted">F</span>
      </p>
      <p className="text-xs text-muted tabular-nums mt-0.5">
        {p.nombre} ticket{p.nombre > 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function ChartVentesAire({ donnees, enChargement, jours }: Props) {
  if (enChargement) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Recettes — {jours} derniers jours</Card.Title>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-60 w-full rounded-lg" />
        </Card.Content>
      </Card>
    );
  }

  const points = genererSerieComplete(donnees ?? [], jours);
  const aucuneVente = points.every((p) => p.recettes === 0);

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm">Recettes — {jours} derniers jours</Card.Title>
      </Card.Header>
      <Card.Content>
        {aucuneVente ? (
          <div className="h-60 flex flex-col items-center justify-center text-muted">
            <TrendingUp size={20} className="mb-1.5" />
            <span className="text-sm">Aucune vente sur la période</span>
          </div>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(iso: string) => FORMAT_JOUR_COURT.format(new Date(iso)).replace(".", "")}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  interval={jours > 14 ? Math.ceil(jours / 7) : 0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                />
                <Tooltip content={<TooltipVentes />} cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="recettes"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#gradAccent)"
                  activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
