"use client";

import { Card, Button } from "@heroui/react";
import { MapPin } from "lucide-react";

interface Props {
  onCreer: () => void;
  contexte?: "pos" | "rapports" | "stock";
}

const MESSAGES: Record<NonNullable<Props["contexte"]>, { titre: string; description: string }> = {
  pos: {
    titre: "Aucun emplacement de caisse",
    description: "Pour ouvrir une caisse, vous devez d'abord declarer au moins un point de vente.",
  },
  rapports: {
    titre: "Aucun emplacement",
    description: "Le rapport Z se calcule par point de vente. Creez-en un pour générer vos rapports.",
  },
  stock: {
    titre: "Aucun emplacement",
    description: "Creez un point de vente ou un entrepot pour commencer a gérer votre stock.",
  },
};

export function AucunEmplacement({ onCreer, contexte = "stock" }: Props) {
  const { titre, description } = MESSAGES[contexte];

  return (
    <Card>
      <Card.Content className="py-12 text-center">
        <span className="inline-flex w-12 h-12 rounded-full bg-warning/10 text-warning items-center justify-center mb-3">
          <MapPin size={20} />
        </span>
        <p className="text-sm font-semibold text-foreground">{titre}</p>
        <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{description}</p>
        <Button variant="primary" className="mt-4 gap-1.5" onPress={onCreer}>
          <MapPin size={16} />
          Creer un emplacement
        </Button>
      </Card.Content>
    </Card>
  );
}
