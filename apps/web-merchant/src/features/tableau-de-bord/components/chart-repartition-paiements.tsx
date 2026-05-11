"use client";

import { Card, Skeleton } from "@heroui/react";
import { Wallet } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import type { IRepartitionPaiement, MethodePaiement } from "../types/dashboard.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  donnees: IRepartitionPaiement[] | undefined;
  enChargement: boolean;
  jours: number;
}

const LABELS_METHODE: Record<MethodePaiement, { label: string; couleur: string }> = {
  CASH:           { label: "Espèces",       couleur: "var(--accent)" },
  MOBILE_MONEY:   { label: "Mobile Money",  couleur: "var(--success)" },
  CARD:           { label: "Carte",         couleur: "var(--warning)" },
  BANK_TRANSFER:  { label: "Virement",      couleur: "color-mix(in oklch, var(--accent), white 35%)" },
  CREDIT:         { label: "Crédit",        couleur: "var(--danger)" },
};

function TooltipPaiements({ active, payload }: { active?: boolean; payload?: Array<{ payload: IRepartitionPaiement }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const meta = LABELS_METHODE[p.methode] ?? { label: p.methode, couleur: "var(--muted)" };
  return (
    <div className="rounded-lg border border-border bg-surface shadow-md px-3 py-2 text-xs">
      <p className="text-sm font-semibold text-foreground mb-1">{meta.label}</p>
      <p className="text-foreground tabular-nums">
        <span className="font-semibold">{formatMontant(p.total)}</span>
        <span className="text-muted text-xs ml-1">F · {p.pourcentage}%</span>
      </p>
      <p className="text-muted tabular-nums mt-0.5">{p.nombre} paiement{p.nombre > 1 ? "s" : ""}</p>
    </div>
  );
}

export function ChartRepartitionPaiements({ donnees, enChargement, jours }: Props) {
  if (enChargement) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Méthodes de paiement</Card.Title>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-60 w-full rounded-lg" />
        </Card.Content>
      </Card>
    );
  }

  const data = donnees ?? [];
  if (data.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Méthodes de paiement — {jours} jours</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="h-60 flex flex-col items-center justify-center text-muted">
            <Wallet size={20} className="mb-1.5" />
            <span className="text-sm">Aucun paiement sur la période</span>
          </div>
        </Card.Content>
      </Card>
    );
  }

  const total = data.reduce((acc, r) => acc + r.total, 0);

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm flex items-center gap-1.5">
          <Wallet size={14} className="text-accent" />
          Méthodes de paiement — {jours} jours
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative" style={{ width: 180, height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="methode"
                  cx="50%" cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  {data.map((d) => (
                    <Cell
                      key={d.methode}
                      fill={LABELS_METHODE[d.methode]?.couleur ?? "var(--muted)"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<TooltipPaiements />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted uppercase tracking-wider">Total</span>
              <span className="text-base font-semibold text-foreground tabular-nums">
                {formatMontant(total)}
              </span>
              <span className="text-[10px] text-muted">F CFA</span>
            </div>
          </div>
          <ul className="flex-1 min-w-[180px] space-y-1.5">
            {data.map((d) => {
              const meta = LABELS_METHODE[d.methode] ?? { label: d.methode, couleur: "var(--muted)" };
              return (
                <li key={d.methode} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: meta.couleur }}
                  />
                  <span className="flex-1 text-foreground whitespace-nowrap">{meta.label}</span>
                  <span className="tabular-nums text-muted whitespace-nowrap">{d.pourcentage}%</span>
                  <span className="tabular-nums font-medium text-foreground text-right whitespace-nowrap">
                    {formatMontant(d.total)} F
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Card.Content>
    </Card>
  );
}
