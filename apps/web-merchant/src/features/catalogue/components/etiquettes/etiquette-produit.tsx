"use client";

import { useMemo } from "react";
import { genererCode128Svg } from "@/lib/barcode";
import { formatMontant } from "@/features/vente/utils/format";

export type FormatEtiquette = "A4_24" | "A4_40" | "THERMIQUE_50x30" | "THERMIQUE_100x50";

interface DimensionsFormat {
  /** Largeur de l'etiquette en mm. */
  largeurMm: number;
  /** Hauteur de l'etiquette en mm. */
  hauteurMm: number;
  /** Largeur d'un module code-barres en px (affecte la lisibilite scan). */
  largeurModulePx: number;
  /** Hauteur des barres en px. */
  hauteurBarresPx: number;
  /** Taille de police pour le SKU sous le barcode. */
  taillePoliceSku: number;
  /** Affichage compact (cache marque/categorie). */
  compact: boolean;
}

export const FORMATS_ETIQUETTE: Record<FormatEtiquette, { libelle: string; description: string; dims: DimensionsFormat }> = {
  A4_24: {
    libelle: "A4 — 24 étiquettes (70×35 mm)",
    description: "Planche A4 avec 24 étiquettes (3 × 8). Format standard Avery L7160/L7159.",
    dims: { largeurMm: 70, hauteurMm: 35, largeurModulePx: 1.5, hauteurBarresPx: 36, taillePoliceSku: 9, compact: false },
  },
  A4_40: {
    libelle: "A4 — 40 étiquettes (52,5×29,7 mm)",
    description: "Planche A4 dense (5 × 8). Format Avery L7170.",
    dims: { largeurMm: 52.5, hauteurMm: 29.7, largeurModulePx: 1.2, hauteurBarresPx: 28, taillePoliceSku: 8, compact: true },
  },
  THERMIQUE_50x30: {
    libelle: "Thermique 50×30 mm (rouleau)",
    description: "Étiquettes thermiques au format rouleau, 1 par 1 (Zebra/Brother).",
    dims: { largeurMm: 50, hauteurMm: 30, largeurModulePx: 1.4, hauteurBarresPx: 30, taillePoliceSku: 9, compact: true },
  },
  THERMIQUE_100x50: {
    libelle: "Thermique 100×50 mm (rouleau)",
    description: "Grand format thermique (rouleau) — convient au scan distance.",
    dims: { largeurMm: 100, hauteurMm: 50, largeurModulePx: 2, hauteurBarresPx: 50, taillePoliceSku: 11, compact: false },
  },
};

interface Props {
  nomProduit: string;
  nomVariante: string | null;
  sku: string;
  prix: number;
  marque?: string | null;
  format: FormatEtiquette;
}

/**
 * Une etiquette produit imprimable : nom + variante + prix + code-barres + SKU.
 * Le rendu utilise les dimensions exactes en mm pour que l'impression soit
 * fidele (CSS @media print preserve les mm).
 */
export function EtiquetteProduit({
  nomProduit, nomVariante, sku, prix, marque, format,
}: Props) {
  const { dims } = FORMATS_ETIQUETTE[format];

  // Memo : eviter de regenerer le SVG a chaque render si rien ne change.
  const svgBarcode = useMemo(() => {
    try {
      return genererCode128Svg(sku, {
        hauteur: dims.hauteurBarresPx,
        largeurModule: dims.largeurModulePx,
        taillePolice: dims.taillePoliceSku,
        marge: 6,
      });
    } catch {
      // Fallback texte si SKU contient des caracteres non supportes
      return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="${dims.hauteurBarresPx}"><text x="50%" y="50%" text-anchor="middle" font-family="monospace" font-size="${dims.taillePoliceSku}">${sku}</text></svg>`;
    }
  }, [sku, dims]);

  return (
    <div
      className="etiquette-cellule overflow-hidden bg-white border border-neutral-200 flex flex-col items-center justify-between text-black p-1"
      style={{
        width: `${dims.largeurMm}mm`,
        height: `${dims.hauteurMm}mm`,
      }}
    >
      <div className="text-center w-full overflow-hidden" style={{ lineHeight: 1.1 }}>
        <p className="font-semibold truncate" style={{ fontSize: dims.compact ? "9px" : "11px" }}>
          {nomProduit}
        </p>
        {nomVariante && !dims.compact && (
          <p className="text-neutral-600 truncate" style={{ fontSize: "9px" }}>
            {nomVariante}
          </p>
        )}
        {marque && !dims.compact && (
          <p className="text-neutral-500 truncate" style={{ fontSize: "8px" }}>
            {marque}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center w-full">
        <span dangerouslySetInnerHTML={{ __html: svgBarcode }} />
      </div>

      <div className="font-bold tabular-nums" style={{ fontSize: dims.compact ? "10px" : "13px" }}>
        {formatMontant(prix)} F
      </div>
    </div>
  );
}
