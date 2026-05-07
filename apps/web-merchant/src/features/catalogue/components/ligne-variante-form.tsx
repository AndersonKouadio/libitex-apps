"use client";

import { TextField, Label, Input, Button } from "@heroui/react";
import { Trash2 } from "lucide-react";
import type { CreerVarianteDTO } from "../schemas/produit.schema";

interface Props {
  index: number;
  variante: CreerVarianteDTO;
  onChange: (index: number, data: Partial<CreerVarianteDTO>) => void;
  onRetirer: (index: number) => void;
  seulElement: boolean;
}

export function LigneVarianteForm({ index, variante, onChange, onRetirer, seulElement }: Props) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border/40">
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TextField
          isRequired
          name={`variante-sku-${index}`}
          value={variante.sku}
          onChange={(v) => onChange(index, { sku: v })}
        >
          <Label>SKU</Label>
          <Input placeholder="REF-001" />
        </TextField>

        <TextField
          name={`variante-nom-${index}`}
          value={variante.nom || ""}
          onChange={(v) => onChange(index, { nom: v })}
        >
          <Label>Variante</Label>
          <Input placeholder="Bleu / M" />
        </TextField>

        <TextField
          isRequired
          name={`variante-prix-${index}`}
          type="number"
          value={String(variante.prixDetail || "")}
          onChange={(v) => onChange(index, { prixDetail: Number(v) || 0 })}
        >
          <Label>Prix detail (F)</Label>
          <Input placeholder="15 000" />
        </TextField>

        <TextField
          name={`variante-prixgros-${index}`}
          type="number"
          value={String(variante.prixGros || "")}
          onChange={(v) => onChange(index, { prixGros: Number(v) || undefined })}
        >
          <Label>Prix gros (F)</Label>
          <Input placeholder="12 000" />
        </TextField>
      </div>

      {!seulElement && (
        <Button
          variant="ghost"
          className="mt-7 p-1.5 h-auto min-w-0 text-muted hover:text-danger hover:bg-danger/10"
          onPress={() => onRetirer(index)}
          aria-label="Retirer cette variante"
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );
}
