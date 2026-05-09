"use client";

import { Select, ListBox, Label } from "@heroui/react";
import { CHAMPS_PRODUIT, type ChampProduit } from "@/lib/csv";

const LABELS_CHAMP: Record<ChampProduit, { libelle: string; obligatoire: boolean }> = {
  nom:        { libelle: "Nom du produit",   obligatoire: true },
  sku:        { libelle: "SKU / Référence",  obligatoire: true },
  prixDetail: { libelle: "Prix de détail",   obligatoire: true },
  description:{ libelle: "Description",      obligatoire: false },
  marque:     { libelle: "Marque",           obligatoire: false },
  codeBarres: { libelle: "Code-barres",      obligatoire: false },
  prixAchat:  { libelle: "Prix d'achat",     obligatoire: false },
  prixGros:   { libelle: "Prix de gros",     obligatoire: false },
  prixVip:    { libelle: "Prix VIP",         obligatoire: false },
  tauxTva:    { libelle: "Taux TVA (%)",     obligatoire: false },
};

interface Props {
  headers: string[];
  mapping: Record<ChampProduit, number | null>;
  onMapping: (m: Record<ChampProduit, number | null>) => void;
}

export function EtapeMapping({ headers, mapping, onMapping }: Props) {
  const champs = Object.keys(CHAMPS_PRODUIT) as ChampProduit[];

  function changer(champ: ChampProduit, valeur: string) {
    onMapping({ ...mapping, [champ]: valeur === "_" ? null : Number(valeur) });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {champs.map((c) => {
          const meta = LABELS_CHAMP[c];
          const idx = mapping[c];
          const value = idx === null ? "_" : String(idx);
          return (
            <div
              key={c}
              className={`rounded-lg border p-3 ${
                meta.obligatoire && idx === null
                  ? "border-danger/40 bg-danger/5"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {meta.libelle}
                  {meta.obligatoire && <span className="text-danger ml-1">*</span>}
                </span>
                {meta.obligatoire && idx === null && (
                  <span className="text-[10px] text-danger">Requis</span>
                )}
              </div>
              <Select
                selectedKey={value}
                onSelectionChange={(k) => changer(c, String(k))}
                aria-label={`Colonne CSV pour ${meta.libelle}`}
              >
                <Label className="sr-only">Colonne</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="_" textValue="Ne pas importer">
                      <span className="text-muted">Ne pas importer</span>
                    </ListBox.Item>
                    {headers.map((h, i) => (
                      <ListBox.Item key={i} id={String(i)} textValue={h || `Colonne ${i + 1}`}>
                        {h || `Colonne ${i + 1}`}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
