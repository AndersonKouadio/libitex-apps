"use client";

import { Card } from "@heroui/react";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

interface Props {
  libelle: string;
  valeur: string;
  unite?: string;
  icone: LucideIcon;
  classesIcone: string;
  tendance?: { valeur: string; positive: boolean };
}

export function CarteKpi({ libelle, valeur, unite, icone: Icone, classesIcone, tendance }: Props) {
  return (
    <Card>
      <Card.Content className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${classesIcone}`}>
            <Icone size={20} strokeWidth={1.8} />
          </span>
          {tendance && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${tendance.positive ? "text-success" : "text-danger"}`}>
              {tendance.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {tendance.valeur}
            </span>
          )}
        </div>
        <p className="text-sm text-muted mb-1">{libelle}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
          {valeur}
          {unite && <span className="text-sm font-normal text-muted ml-1">{unite}</span>}
        </p>
      </Card.Content>
    </Card>
  );
}
