"use client";

import { Card, Skeleton } from "@heroui/react";
import { TrendingUp } from "lucide-react";
import type { IPointVentesJour } from "../types/dashboard.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  donnees: IPointVentesJour[] | undefined;
  enChargement: boolean;
}

const HAUTEUR = 160;

function libelleJour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

export function CourbeVentes({ donnees, enChargement }: Props) {
  if (enChargement) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Recettes des 7 derniers jours</Card.Title>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-40 w-full rounded-lg" />
        </Card.Content>
      </Card>
    );
  }

  const points = donnees ?? [];
  const aucuneVente = points.length === 0 || points.every((p) => p.recettes === 0);
  const max = Math.max(...points.map((p) => p.recettes), 1);

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm">Recettes des 7 derniers jours</Card.Title>
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
              const hauteur = Math.max(4, (p.recettes / max) * HAUTEUR);
              return (
                <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-semibold text-foreground tabular-nums">
                    {p.recettes > 0 ? formatMontant(p.recettes) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-accent/80 hover:bg-accent transition-colors"
                    style={{ height: `${hauteur}px` }}
                    title={`${p.recettes.toLocaleString("fr-FR")} F le ${p.date}`}
                  />
                  <span className="text-xs text-muted capitalize">{libelleJour(p.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
