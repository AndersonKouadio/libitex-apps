"use client";

import { TextField, Label, Input } from "@heroui/react";
import { Info } from "lucide-react";
import type { CreerVarianteDTO } from "../schemas/produit.schema";
import type { TypeProduit } from "../hooks/useFormProduit";

interface Props {
  type: Exclude<TypeProduit, "VARIANT">;
  variante: CreerVarianteDTO;
  onChange: (data: Partial<CreerVarianteDTO>) => void;
}

const NOTES: Record<Exclude<TypeProduit, "VARIANT">, string | null> = {
  SIMPLE: null,
  SERIALIZED: "Les numéros de série et IMEI seront saisis à la réception du stock, pas ici.",
  PERISHABLE: "Les lots et dates de péremption seront saisis à la réception du stock, pas ici.",
};

export function SectionVarianteUnique({ type, variante, onChange }: Props) {
  const note = NOTES[type];

  return (
    <div className="space-y-4">
      {note && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-accent/5 text-accent text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          isRequired
          name="sku"
          value={variante.sku}
          onChange={(v) => onChange({ sku: v })}
        >
          <Label>SKU / Reference</Label>
          <Input placeholder="REF-001" />
        </TextField>

        <TextField
          name="codeBarres"
          value={variante.codeBarres ?? ""}
          onChange={(v) => onChange({ codeBarres: v || undefined })}
        >
          <Label>Code-barres variante (optionnel)</Label>
          <Input placeholder="3017620422003" />
        </TextField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          name="prixAchat"
          type="number"
          value={variante.prixAchat ? String(variante.prixAchat) : ""}
          onChange={(v) => onChange({ prixAchat: v ? Number(v) : undefined })}
        >
          <Label>Prix d'achat (F CFA)</Label>
          <Input placeholder="9 500" min="0" />
        </TextField>

        <TextField
          isRequired
          name="prixDetail"
          type="number"
          value={variante.prixDetail ? String(variante.prixDetail) : ""}
          onChange={(v) => onChange({ prixDetail: Number(v) || 0 })}
        >
          <Label>Prix de détail (F CFA)</Label>
          <Input placeholder="15 000" min="0" />
        </TextField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          name="prixGros"
          type="number"
          value={variante.prixGros ? String(variante.prixGros) : ""}
          onChange={(v) => onChange({ prixGros: v ? Number(v) : undefined })}
        >
          <Label>Prix de gros (optionnel)</Label>
          <Input placeholder="12 000" min="0" />
        </TextField>

        <TextField
          name="prixVip"
          type="number"
          value={variante.prixVip ? String(variante.prixVip) : ""}
          onChange={(v) => onChange({ prixVip: v ? Number(v) : undefined })}
        >
          <Label>Prix VIP (optionnel)</Label>
          <Input placeholder="11 000" min="0" />
        </TextField>
      </div>
    </div>
  );
}
