"use client";

import { Button } from "@heroui/react";
import { MapPin } from "lucide-react";
import { EmptyState } from "./empty-state";

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
    <EmptyState
      icone={MapPin}
      tonalite="warning"
      titre={titre}
      description={description}
      action={
        <Button variant="primary" className="gap-1.5" onPress={onCreer}>
          <MapPin size={16} />
          Creer un emplacement
        </Button>
      }
    />
  );
}
