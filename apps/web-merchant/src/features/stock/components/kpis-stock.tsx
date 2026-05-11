"use client";

import { Wallet, AlertTriangle, Boxes } from "lucide-react";
import { CarteKpi } from "@/features/tableau-de-bord/components/carte-kpi";
import { formatMontantXOF, type KpiStock } from "../utils/calcul-kpi";

interface Props {
  kpis: KpiStock;
}

export function KpisStock({ kpis }: Props) {
  const totalAlertes = kpis.nbAlertes + kpis.nbRuptures;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <CarteKpi
        libelle="Valeur du stock"
        valeur={formatMontantXOF(kpis.valeurTotale)}
        unite="F (au prix d'achat)"
        icone={Wallet}
        classesIcone="bg-accent/10 text-accent"
        taille="compact"
      />
      <CarteKpi
        libelle="Unités en rayon"
        valeur={kpis.totalUnites.toLocaleString("fr-FR")}
        unite={`sur ${kpis.nbLignes} référence${kpis.nbLignes > 1 ? "s" : ""}`}
        icone={Boxes}
        classesIcone="bg-success/10 text-success"
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
