"use client";

import { Card, Skeleton } from "@heroui/react";
import { TrendingUp } from "lucide-react";
import type { IPointVentesJour } from "../types/dashboard.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  donnees: IPointVentesJour[] | undefined;
  enChargement: boolean;
  jours?: number;
}

const HAUTEUR = 160;

function libelleJour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

function dateIso(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

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

export function CourbeVentes({ donnees, enChargement, jours = 7 }: Props) {
  if (enChargement) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Recettes des {jours} derniers jours</Card.Title>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-40 w-full rounded-lg" />
        </Card.Content>
      </Card>
    );
  }

  const points = genererSerieComplete(donnees ?? [], jours);
  const aucuneVente = points.every((p) => p.recettes === 0);
  const max = Math.max(...points.map((p) => p.recettes), 1);

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm">Recettes des {jours} derniers jours</Card.Title>
      </Card.Header>
      <Card.Content>
        {aucuneVente ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted">
            <TrendingUp size={20} className="mb-1.5" />
            <span className="text-sm">Aucune vente sur la periode</span>
          </div>
        ) : (
          <div className="flex items-end gap-2" style={{ height: HAUTEUR }} role="img" aria-label="Recettes par jour">
            {points.map((p) => {
              const ratio = p.recettes / max;
              const hauteur = p.recettes > 0 ? Math.max(8, ratio * HAUTEUR) : 4;
              return (
                <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-semibold text-foreground tabular-nums leading-none h-3">
                    {p.recettes > 0 ? formatMontant(p.recettes) : ""}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-colors ${
                      p.recettes > 0
                        ? "bg-accent/80 hover:bg-accent"
                        : "bg-muted/15"
                    }`}
                    style={{ height: `${hauteur}px` }}
                    title={`${formatMontant(p.recettes)} F le ${p.date} (${p.nombre} ticket${p.nombre > 1 ? "s" : ""})`}
                  />
                  <span className="text-xs text-muted capitalize leading-none">{libelleJour(p.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
