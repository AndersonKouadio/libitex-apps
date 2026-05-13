"use client";

import { useState } from "react";
import {
  Banknote, Receipt, Package, MapPin, Coins,
  ShoppingCart, Warehouse, BarChart3,
} from "lucide-react";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useKpisQuery, useVentesParJourQuery, useTopProduitsQuery,
  useRepartitionPaiementsQuery, useKpisPeriodeQuery,
} from "@/features/tableau-de-bord/queries/kpis.query";
import { useTicketListQuery } from "@/features/vente/queries/ticket-list.query";
import { CarteKpi } from "@/features/tableau-de-bord/components/carte-kpi";
import { CarteKpiTendance } from "@/features/tableau-de-bord/components/carte-kpi-tendance";
import { LienRapide } from "@/features/tableau-de-bord/components/lien-rapide";
import { ChartVentesAire } from "@/features/tableau-de-bord/components/chart-ventes-aire";
import { ChartTopProduits } from "@/features/tableau-de-bord/components/chart-top-produits";
import { ChartRepartitionPaiements } from "@/features/tableau-de-bord/components/chart-repartition-paiements";
import {
  SelecteurPeriode, type PeriodeJours,
} from "@/features/tableau-de-bord/components/selecteur-periode";
import { CarteOnboarding } from "@/features/tableau-de-bord/components/carte-onboarding";
import { BanniereConfigIncomplete } from "@/features/boutique/components/banniere-config-incomplete";
import { HistoriqueTickets } from "@/features/vente/components/historique-tickets";
import { formatMontant } from "@/features/vente/utils/format";

const LIBELLE_PERIODE: Record<PeriodeJours, string> = {
  7: "7 derniers jours",
  30: "30 derniers jours",
  90: "90 derniers jours",
};

export default function TableauDeBordPage() {
  const { boutiqueActive } = useAuth();
  const [periode, setPeriode] = useState<PeriodeJours>(7);
  const { data: kpisOnboarding, isLoading: kpisChargement } = useKpisQuery();
  const { data: kpis, isLoading: kpisPeriodeChargement } = useKpisPeriodeQuery(periode);
  const { data: ventes, isLoading: ventesChargement } = useVentesParJourQuery(periode);
  const { data: topProduits, isLoading: topChargement } = useTopProduitsQuery(periode);
  const { data: paiements, isLoading: paiementsChargement } = useRepartitionPaiementsQuery(periode);
  const { data: ticketsData } = useTicketListQuery({ page: 1 });

  const tickets = (ticketsData?.data ?? []).slice(0, 5);
  const libellePrec = `${LIBELLE_PERIODE[periode]} précédents`;

  return (
    <PageContainer>
      {!kpisChargement && (
        <CarteOnboarding
          nombreProduits={kpisOnboarding?.nombreProduits ?? 0}
          nombreEmplacements={kpisOnboarding?.nombreEmplacements ?? 0}
          nomBoutique={boutiqueActive?.nom}
        />
      )}

      {/* Module 14 D2 : nudge config incomplete (logo/tel/adresse) */}
      <BanniereConfigIncomplete />

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Vue d'ensemble — {LIBELLE_PERIODE[periode]}
        </h2>
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpisPeriodeChargement || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))
        ) : (
          <>
            <CarteKpiTendance
              libelle="Recettes"
              valeur={formatMontant(kpis.recettes)}
              unite="F"
              icone={Banknote}
              classesIcone="bg-accent/10 text-accent"
              tendance={kpis.tendanceRecettes}
              libellePrecedente={libellePrec}
            />
            <CarteKpiTendance
              libelle="Tickets"
              valeur={String(kpis.tickets)}
              icone={Receipt}
              classesIcone="bg-warning/10 text-warning"
              tendance={kpis.tendanceTickets}
              libellePrecedente={libellePrec}
            />
            <CarteKpiTendance
              libelle="Ticket moyen"
              valeur={formatMontant(kpis.ticketMoyen)}
              unite="F"
              icone={Coins}
              classesIcone="bg-success/10 text-success"
              tendance={kpis.tendanceTicketMoyen}
              libellePrecedente={libellePrec}
            />
            <CarteKpi
              libelle="Catalogue actif"
              valeur={String(kpisOnboarding?.nombreProduits ?? 0)}
              icone={Package}
              classesIcone="bg-accent/10 text-accent"
            />
          </>
        )}
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          Accès rapide
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <LienRapide href="/pos" icone={ShoppingCart} libelle="Ouvrir la caisse" classesIcone="bg-accent/10 text-accent" />
          <LienRapide href="/catalogue" icone={Package} libelle="Gérer le catalogue" classesIcone="bg-warning/10 text-warning" />
          <LienRapide href="/stock" icone={Warehouse} libelle="Mouvements de stock" classesIcone="bg-success/10 text-success" />
          <LienRapide href="/rapports" icone={BarChart3} libelle="Consulter les rapports" classesIcone="bg-muted/10 text-muted" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <ChartVentesAire donnees={ventes} enChargement={ventesChargement} jours={periode} />
        </div>
        <ChartRepartitionPaiements
          donnees={paiements}
          enChargement={paiementsChargement}
          jours={periode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartTopProduits donnees={topProduits} enChargement={topChargement} jours={periode} />
        </div>
        <Card>
          <Card.Header>
            <Card.Title className="text-sm">Derniers tickets</Card.Title>
            {!kpisChargement && (
              <span className="ml-auto text-xs text-muted flex items-center gap-1">
                <MapPin size={12} />
                {kpisOnboarding?.nombreEmplacements ?? 0} emplacement{(kpisOnboarding?.nombreEmplacements ?? 0) > 1 ? "s" : ""}
              </span>
            )}
          </Card.Header>
          <Card.Content className="p-0">
            <HistoriqueTickets tickets={tickets} />
          </Card.Content>
        </Card>
      </div>
    </PageContainer>
  );
}
