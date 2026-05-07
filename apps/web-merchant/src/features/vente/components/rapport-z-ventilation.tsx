"use client";

import { Card, ProgressBar } from "@heroui/react";
import type { IRapportZ } from "../types/vente.type";
import { formatMontant } from "../utils/format";
import { iconeMethode, libelleMethode } from "../utils/methode-paiement";

interface Props {
  rapport: IRapportZ;
}

export function RapportZVentilation({ rapport }: Props) {
  const totalRevenu = rapport.resume.totalRevenu;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm">Ventilation par mode de paiement</Card.Title>
      </Card.Header>
      <Card.Content>
        {rapport.ventilationPaiements.length === 0 ? (
          <p className="text-sm text-muted py-4">Aucune vente pour cette journee</p>
        ) : (
          <div className="space-y-3">
            {rapport.ventilationPaiements.map((p) => {
              const Icone = iconeMethode(p.methode);
              const pct = totalRevenu > 0 ? Math.round((p.total / totalRevenu) * 100) : 0;
              return (
                <div key={p.methode} className="flex items-center gap-4 py-2">
                  <span className="w-9 h-9 rounded-lg bg-surface-secondary flex items-center justify-center text-muted shrink-0">
                    <Icone size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {libelleMethode(p.methode)}
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatMontant(p.total)} F
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={pct} aria-label={`Part ${libelleMethode(p.methode)}`} className="flex-1" />
                      <span className="text-xs text-muted tabular-nums w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted tabular-nums shrink-0">
                    {p.nombre} tx
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
