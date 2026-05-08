"use client";

import { Card } from "@heroui/react";
import { BarChart3 } from "lucide-react";
import type { IRapportZ } from "../types/vente.type";
import { formatMontant } from "../utils/format";

interface Props {
  rapport: IRapportZ;
}

interface KpiProps {
  libelle: string;
  valeur: string;
}

function CaseKpi({ libelle, valeur }: KpiProps) {
  return (
    <div className="p-4 rounded-lg bg-surface-secondary">
      <p className="text-xs text-muted mb-1">{libelle}</p>
      <p className="text-xl font-bold text-foreground tabular-nums">{valeur}</p>
    </div>
  );
}

export function RapportZResume({ rapport }: Props) {
  const { resume } = rapport;
  const chiffreAffaires = Number(resume.chiffreAffaires) || 0;
  const totalTva = Number(resume.totalTva) || 0;
  const totalTickets = Number(resume.totalTickets) || 0;
  const ticketMoyen = totalTickets > 0 ? formatMontant(chiffreAffaires / totalTickets) : "--";

  const dateLisible = new Date(rapport.date).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Card>
      <Card.Header>
        <BarChart3 size={18} strokeWidth={2} className="text-accent" />
        <Card.Title className="text-sm">Z de caisse du {dateLisible}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CaseKpi libelle="Recettes" valeur={`${formatMontant(chiffreAffaires)} F`} />
          <CaseKpi libelle="Tickets" valeur={String(totalTickets)} />
          <CaseKpi libelle="TVA collectée" valeur={`${formatMontant(totalTva)} F`} />
          <CaseKpi libelle="Ticket moyen" valeur={`${ticketMoyen}${totalTickets > 0 ? " F" : ""}`} />
        </div>
      </Card.Content>
    </Card>
  );
}
