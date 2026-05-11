"use client";

import { Chip } from "@heroui/react";
import { Crown, Repeat, Coffee, Moon, Sparkles } from "lucide-react";
import type { SegmentClient } from "../types/client.type";

const META: Record<SegmentClient, { label: string; icone: typeof Crown; classes: string }> = {
  VIP:         { label: "VIP",         icone: Crown,    classes: "bg-accent/15 text-accent" },
  REGULIER:    { label: "Régulier",    icone: Repeat,   classes: "bg-success/15 text-success" },
  OCCASIONNEL: { label: "Occasionnel", icone: Coffee,   classes: "bg-warning/15 text-warning" },
  INACTIF:     { label: "Inactif",     icone: Moon,     classes: "bg-danger/10 text-danger" },
  NOUVEAU:     { label: "Nouveau",     icone: Sparkles, classes: "bg-muted/10 text-muted" },
};

interface Props {
  segment: SegmentClient;
  /** Affiche uniquement l'icone + texte court sans le fond colore (utile en liste compacte). */
  variant?: "default" | "minimal";
}

export function ChipSegment({ segment, variant = "default" }: Props) {
  const meta = META[segment];
  const Icone = meta.icone;
  if (variant === "minimal") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${meta.classes.split(" ")[1]}`}>
        <Icone size={11} />
        {meta.label}
      </span>
    );
  }
  return (
    <Chip className={`text-xs gap-1 ${meta.classes}`}>
      <Icone size={11} />
      {meta.label}
    </Chip>
  );
}

export const SEGMENT_OPTIONS: Array<{ id: SegmentClient; label: string }> = [
  { id: "VIP", label: "VIP" },
  { id: "REGULIER", label: "Régulier" },
  { id: "OCCASIONNEL", label: "Occasionnel" },
  { id: "INACTIF", label: "Inactif" },
  { id: "NOUVEAU", label: "Nouveau" },
];
