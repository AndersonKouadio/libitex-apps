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
  /**
   * "normal" (defaut) = grandes cartes pour le dashboard.
   * "compact" = pour les pages secondaires (sessions caisse, rapports...)
   * ou les KPIs sont contextuels et ne doivent pas dominer l'ecran.
   */
  taille?: "normal" | "compact";
}

export function CarteKpi({
  libelle, valeur, unite, icone: Icone, classesIcone, tendance,
  taille = "normal",
}: Props) {
  const compact = taille === "compact";
  return (
    <Card>
      <Card.Content className={compact ? "p-3" : "p-5"}>
        <div className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-3"}`}>
          <span
            className={`rounded-lg flex items-center justify-center ${classesIcone} ${
              compact ? "w-7 h-7" : "w-10 h-10"
            }`}
          >
            <Icone size={compact ? 14 : 20} strokeWidth={1.8} />
          </span>
          {tendance && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${tendance.positive ? "text-success" : "text-danger"}`}>
              {tendance.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {tendance.valeur}
            </span>
          )}
        </div>
        <p className={`text-muted ${compact ? "text-xs mb-0.5" : "text-sm mb-1"}`}>{libelle}</p>
        <p
          className={`font-semibold text-foreground tabular-nums tracking-tight ${
            compact ? "text-base" : "text-2xl"
          }`}
        >
          {valeur}
          {unite && (
            <span className={`font-normal text-muted ml-1 ${compact ? "text-[10px]" : "text-sm"}`}>
              {unite}
            </span>
          )}
        </p>
      </Card.Content>
    </Card>
  );
}
