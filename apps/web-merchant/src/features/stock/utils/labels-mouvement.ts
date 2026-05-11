import type { TypeMouvementStock } from "../types/stock.type";
import type { TypeMouvementIngredient } from "@/features/ingredient/types/ingredient.type";

/** Libelle + couleur semantique pour chaque type de mouvement variante. */
export const LABELS_MOUVEMENT_STOCK: Record<
  TypeMouvementStock,
  { label: string; couleur: "success" | "danger" | "warning" | "accent" | "muted" }
> = {
  STOCK_IN:       { label: "Réception",     couleur: "success" },
  STOCK_OUT:      { label: "Vente",         couleur: "danger"  },
  TRANSFER_OUT:   { label: "Transfert ↗",   couleur: "accent"  },
  TRANSFER_IN:    { label: "Transfert ↘",   couleur: "accent"  },
  ADJUSTMENT:     { label: "Ajustement",    couleur: "warning" },
  RETURN_IN:      { label: "Retour client", couleur: "success" },
  DEFECTIVE_OUT:  { label: "Défectueux",    couleur: "danger"  },
  WRITE_OFF:      { label: "Casse / perte", couleur: "danger"  },
};

/** Libelle + couleur semantique pour chaque type de mouvement ingredient. */
export const LABELS_MOUVEMENT_INGREDIENT: Record<
  TypeMouvementIngredient,
  { label: string; couleur: "success" | "danger" | "warning" | "accent" | "muted" }
> = {
  STOCK_IN:     { label: "Réception",     couleur: "success" },
  CONSUMPTION:  { label: "Consommation",  couleur: "danger"  },
  ADJUSTMENT:   { label: "Ajustement",    couleur: "warning" },
  WASTE:        { label: "Casse / perte", couleur: "danger"  },
  TRANSFER_IN:  { label: "Transfert ↘",   couleur: "accent"  },
  TRANSFER_OUT: { label: "Transfert ↗",   couleur: "accent"  },
};
