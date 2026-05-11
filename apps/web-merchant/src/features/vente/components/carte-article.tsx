"use client";

import { Chip } from "@heroui/react";
import { Package, AlertTriangle, Scale } from "lucide-react";
import type { IProduit, IVariante } from "@/features/catalogue/types/produit.type";
import { formatMontant } from "../utils/format";
import { UniteMesure, UNITE_LABELS, uniteAccepteDecimal } from "@/features/unite/types/unite.type";

interface Props {
  produit: IProduit;
  variante: IVariante;
  stock: number | null;
  /** Nb portions servables si MENU (calcule depuis stock ingredients). */
  portionsMenu?: number;
  onAjouter: () => void;
}

export function CarteArticle({ produit, variante, stock, portionsMenu, onAjouter }: Props) {
  // MENU : stock gere via les ingredients de la recette. On affiche le nb
  // de portions servables (calcule cote backend) si fourni.
  const estMenu = produit.typeProduit === "MENU";
  const stockGeré = !estMenu;
  // Pour les non-MENU : null (jamais aucun mouvement) = 0 = rupture.
  const stockEffectif = stockGeré ? (stock ?? 0) : null;
  const enRupture = estMenu
    ? portionsMenu === 0
    : (stockEffectif !== null && stockEffectif <= 0);
  const stockBas = estMenu
    ? (portionsMenu !== undefined && portionsMenu > 0 && portionsMenu < 5)
    : (stockEffectif !== null && stockEffectif > 0 && stockEffectif < 5);
  const image = produit.images?.[0];
  const unite = variante.uniteVente ?? UniteMesure.PIECE;
  const peseur = uniteAccepteDecimal(unite);

  return (
    <button
      type="button"
      onClick={enRupture ? undefined : onAjouter}
      disabled={enRupture}
      className={`group relative w-full text-left bg-surface rounded-xl border border-border overflow-hidden transition-all ${
        enRupture
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-accent hover:shadow-md active:scale-[0.98]"
      }`}
    >
      <div className="aspect-square w-full bg-surface-secondary relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={produit.nom}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted/30">
            <Package size={32} strokeWidth={2} />
          </div>
        )}

        {enRupture && (
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <Chip className="bg-danger text-white text-xs font-semibold gap-1">
              <AlertTriangle size={12} strokeWidth={2} />
              {estMenu ? "Ingrédients épuisés" : "Rupture"}
            </Chip>
          </div>
        )}

        {!enRupture && stockGeré && stockEffectif !== null && stockEffectif > 0 && (
          <div className="absolute top-2 right-2">
            <Chip
              className={`text-[10px] font-semibold ${
                stockBas ? "bg-warning/90 text-warning-foreground" : "bg-foreground/70 text-white"
              }`}
            >
              {stockEffectif} {peseur ? UNITE_LABELS[unite] : "en stock"}
            </Chip>
          </div>
        )}

        {!enRupture && estMenu && portionsMenu !== undefined && portionsMenu > 0 && (
          <div className="absolute top-2 right-2">
            <Chip
              className={`text-[10px] font-semibold ${
                stockBas ? "bg-warning/90 text-warning-foreground" : "bg-foreground/70 text-white"
              }`}
            >
              {portionsMenu} portion{portionsMenu > 1 ? "s" : ""}
            </Chip>
          </div>
        )}

        {peseur && (
          <div className="absolute top-2 left-2">
            <Chip className="bg-accent/90 text-white text-[10px] font-semibold gap-1">
              <Scale size={10} strokeWidth={2} />
              {variante.prixParUnite ? `Au ${UNITE_LABELS[unite]}` : UNITE_LABELS[unite]}
            </Chip>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {produit.nom}
        </p>
        {variante.nom && (
          <p className="text-xs text-muted truncate mt-0.5">{variante.nom}</p>
        )}
        <p className="text-[11px] text-muted/70 mt-0.5 font-mono truncate">{variante.sku}</p>
        <p className="text-base font-semibold text-foreground mt-2 tabular-nums">
          {formatMontant(variante.prixDetail)}
          <span className="text-[11px] font-normal text-muted ml-1">
            F{variante.prixParUnite && <> / {UNITE_LABELS[unite]}</>}
          </span>
        </p>
      </div>
    </button>
  );
}
