"use client";

import { Card } from "@heroui/react";
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";
import type { ITendance } from "../types/dashboard.type";

interface Props {
  libelle: string;
  valeur: string;
  unite?: string;
  icone: LucideIcon;
  classesIcone: string;
  tendance: ITendance;
  libellePrecedente?: string;
}

/**
 * Carte KPI dashboard avec indicateur de tendance vs periode precedente.
 * - Variation positive = vert avec fleche montante
 * - Variation negative = rouge avec fleche descendante
 * - Variation null (precedente 0) = "nouveau", neutre
 * - Hover : revele la valeur de la periode precedente en bas
 */
export function CarteKpiTendance({
  libelle, valeur, unite, icone: Icone, classesIcone, tendance, libellePrecedente,
}: Props) {
  const variation = tendance.variation;
  const positif = variation != null && variation > 0;
  const negatif = variation != null && variation < 0;
  const stable = variation === 0;
  const sansComparaison = variation === null;

  const couleurTendance = positif ? "text-success"
    : negatif ? "text-danger"
    : "text-muted";
  const IconeTendance = positif ? ArrowUpRight
    : negatif ? ArrowDownRight
    : Minus;

  return (
    <Card className="group">
      <Card.Content className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`rounded-lg w-9 h-9 flex items-center justify-center ${classesIcone}`}>
            <Icone size={18} strokeWidth={1.8} />
          </span>
          {sansComparaison ? (
            <span className="text-[10px] text-muted/70">aucune base</span>
          ) : (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${couleurTendance}`}>
              <IconeTendance size={14} />
              {stable ? "0%" : `${variation > 0 ? "+" : ""}${variation.toFixed(0)}%`}
            </span>
          )}
        </div>
        <p className="text-xs text-muted mb-1">{libelle}</p>
        <p className="text-xl font-semibold text-foreground tabular-nums tracking-tight">
          {valeur}
          {unite && <span className="text-xs font-normal text-muted ml-1">{unite}</span>}
        </p>
        {libellePrecedente && tendance.precedente > 0 && (
          <p className="text-[10px] text-muted/70 mt-1 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
            {libellePrecedente} : {tendance.precedente.toLocaleString("fr-FR")}
          </p>
        )}
      </Card.Content>
    </Card>
  );
}
