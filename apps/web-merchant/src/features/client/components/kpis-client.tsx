"use client";

import { Wallet, Receipt, Coins, Clock } from "lucide-react";
import { CarteKpi } from "@/features/tableau-de-bord/components/carte-kpi";
import type { IKpisClient } from "../types/client.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  kpis: IKpisClient;
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

function depuis(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const jours = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} jour${jours > 1 ? "s" : ""}`;
  if (jours < 365) return `il y a ${Math.floor(jours / 30)} mois`;
  return `il y a ${Math.floor(jours / 365)} an${Math.floor(jours / 365) > 1 ? "s" : ""}`;
}

export function KpisClient({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <CarteKpi
        libelle="CA total"
        valeur={formatMontant(kpis.caTotal)}
        unite="F"
        icone={Wallet}
        classesIcone="bg-accent/10 text-accent"
        taille="compact"
      />
      <CarteKpi
        libelle="Tickets"
        valeur={String(kpis.nbTickets)}
        icone={Receipt}
        classesIcone="bg-warning/10 text-warning"
        taille="compact"
      />
      <CarteKpi
        libelle="Ticket moyen"
        valeur={formatMontant(kpis.ticketMoyen)}
        unite="F"
        icone={Coins}
        classesIcone="bg-success/10 text-success"
        taille="compact"
      />
      <CarteKpi
        libelle="Dernière visite"
        valeur={kpis.dernierAchat ? FORMAT_DATE.format(new Date(kpis.dernierAchat)) : "—"}
        unite={kpis.dernierAchat ? depuis(kpis.dernierAchat) : undefined}
        icone={Clock}
        classesIcone="bg-muted/10 text-muted"
        taille="compact"
      />
    </div>
  );
}
