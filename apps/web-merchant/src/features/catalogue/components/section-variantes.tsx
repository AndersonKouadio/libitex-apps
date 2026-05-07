"use client";

import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import type { CreerVarianteDTO } from "../schemas/produit.schema";
import { LigneVarianteForm } from "./ligne-variante-form";

interface Props {
  variantes: CreerVarianteDTO[];
  onChange: (index: number, data: Partial<CreerVarianteDTO>) => void;
  onAjouter: () => void;
  onRetirer: (index: number) => void;
}

export function SectionVariantes({ variantes, onChange, onAjouter, onRetirer }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">
          Variantes ({variantes.length})
        </p>
        <Button variant="ghost" className="gap-1.5 text-xs" onPress={onAjouter}>
          <Plus size={14} />
          Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {variantes.map((v, i) => (
          <LigneVarianteForm
            key={i}
            index={i}
            variante={v}
            onChange={onChange}
            onRetirer={onRetirer}
            seulElement={variantes.length === 1}
          />
        ))}
      </div>
    </div>
  );
}
