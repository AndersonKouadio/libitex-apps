"use client";

import { TextField, Label, Input, Button } from "@heroui/react";
import { Info, RefreshCw } from "lucide-react";
import type { CreerVarianteDTO } from "../schemas/produit.schema";
import type { TypeProduit } from "../hooks/useFormProduit";
import { UniteMesure, UNITE_LABELS } from "@/features/unite/types/unite.type";
import { BlocUniteVente } from "./bloc-unite-vente";

interface Props {
  type: Exclude<TypeProduit, "VARIANT">;
  variante: CreerVarianteDTO;
  onChange: (data: Partial<CreerVarianteDTO>) => void;
  onRegenererSku?: () => void;
}

const NOTES: Record<Exclude<TypeProduit, "VARIANT">, string | null> = {
  SIMPLE: null,
  SERIALIZED: "Les numéros de série et IMEI seront saisis à la réception du stock, pas ici.",
  PERISHABLE: "Les lots et dates de péremption seront saisis à la réception du stock, pas ici.",
  MENU: "Le stock du menu est géré via les ingrédients de la recette ci-dessous, pas par SKU.",
};

export function SectionVarianteUnique({ type, variante, onChange, onRegenererSku }: Props) {
  const note = NOTES[type];
  const uniteVente = variante.uniteVente ?? UniteMesure.PIECE;
  const labelPrix = variante.prixParUnite
    ? `Prix de détail au ${UNITE_LABELS[uniteVente]} (F CFA)`
    : "Prix de détail (F CFA)";

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
          <Label className="flex items-center justify-between">
            <span>SKU / Référence</span>
            {onRegenererSku && (
              <Button
                variant="ghost"
                className="text-[10px] gap-1 px-1.5 py-0.5 h-auto min-w-0 text-muted hover:text-accent"
                onPress={onRegenererSku}
                aria-label="Regénérer le SKU automatiquement"
              >
                <RefreshCw size={11} />
                Auto
              </Button>
            )}
          </Label>
          <Input placeholder="Auto-généré depuis le nom" />
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

      <BlocUniteVente variante={variante} onChange={onChange} />

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
          <Label>{labelPrix}</Label>
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
