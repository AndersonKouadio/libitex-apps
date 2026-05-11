"use client";

import { Wallet, AlertTriangle, Wheat } from "lucide-react";
import { CarteKpi } from "@/features/tableau-de-bord/components/carte-kpi";
import { formatMontantXOF } from "@/features/stock/utils/calcul-kpi";
import type { KpiStockIngredient } from "../utils/calcul-kpi";

interface Props {
  kpis: KpiStockIngredient;
}

export function KpisStockIngredients({ kpis }: Props) {
  const totalAlertes = kpis.nbAlertes + kpis.nbRuptures;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <CarteKpi
        libelle="Valeur des ingrédients"
        valeur={formatMontantXOF(kpis.valeurTotale)}
        unite="F (au coût unitaire)"
        icone={Wallet}
        classesIcone="bg-accent/10 text-accent"
        taille="compact"
      />
      <CarteKpi
        libelle="Ingrédients déclarés"
        valeur={String(kpis.nbIngredients)}
        unite={kpis.nbIngredients > 1 ? "références" : "référence"}
        icone={Wheat}
        classesIcone="bg-warning/10 text-warning"
        taille="compact"
      />
      <CarteKpi
        libelle="Alertes stock"
        valeur={String(totalAlertes)}
        unite={kpis.nbRuptures > 0 ? `dont ${kpis.nbRuptures} en rupture` : "à surveiller"}
        icone={AlertTriangle}
        classesIcone={
          totalAlertes === 0
            ? "bg-muted/10 text-muted"
            : kpis.nbRuptures > 0
            ? "bg-danger/10 text-danger"
            : "bg-warning/10 text-warning"
        }
        taille="compact"
      />
    </div>
  );
}
