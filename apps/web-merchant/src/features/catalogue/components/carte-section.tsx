"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@heroui/react";

type Variante = "accent" | "primary" | "secondary" | "warning" | "success" | "muted";

const CLASSES_VARIANTES: Record<Variante, string> = {
  accent: "bg-accent/10 text-accent",
  primary: "bg-primary-500/10 text-primary-500",
  secondary: "bg-secondary/10 text-secondary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  muted: "bg-muted/10 text-muted",
};

interface Props {
  icone: LucideIcon;
  titre: string;
  description?: string;
  variante?: Variante;
  children: React.ReactNode;
}

/**
 * Carte sectionnee : en-tete (icone + titre + sous-titre) + corps. Utilisee pour
 * structurer les pages de formulaire en blocs visuellement distincts.
 */
export function CarteSection({
  icone: Icone, titre, description, variante = "accent", children,
}: Props) {
  return (
    <Card>
      <Card.Header className="flex items-start gap-3 p-5 pb-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${CLASSES_VARIANTES[variante]}`}>
          <Icone size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <Card.Title className="text-sm font-semibold text-foreground">{titre}</Card.Title>
          {description && (
            <Card.Description className="text-xs text-muted mt-0.5">{description}</Card.Description>
          )}
        </div>
      </Card.Header>
      <Card.Content className="p-5 pt-2 space-y-4 border-t border-border">
        {children}
      </Card.Content>
    </Card>
  );
}
