"use client";

import {
  Banknote, Receipt, Package, MapPin, Coins,
  ShoppingCart, Warehouse, BarChart3,
} from "lucide-react";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useKpisQuery, useVentesParJourQuery } from "@/features/tableau-de-bord/queries/kpis.query";
import { useTicketListQuery } from "@/features/vente/queries/ticket-list.query";
import { CarteKpi } from "@/features/tableau-de-bord/components/carte-kpi";
import { LienRapide } from "@/features/tableau-de-bord/components/lien-rapide";
import { CourbeVentes } from "@/features/tableau-de-bord/components/courbe-ventes";
import { CarteOnboarding } from "@/features/tableau-de-bord/components/carte-onboarding";
import { HistoriqueTickets } from "@/features/vente/components/historique-tickets";
import { formatMontant } from "@/features/vente/utils/format";

export default function TableauDeBordPage() {
  const { boutiqueActive } = useAuth();
  const { data: kpis, isLoading: kpisChargement } = useKpisQuery();
  const { data: ventes, isLoading: ventesChargement } = useVentesParJourQuery(7);
  const { data: ticketsData } = useTicketListQuery({ page: 1 });

  const tickets = (ticketsData?.data ?? []).slice(0, 5);

  return (
    <PageContainer>
      {!kpisChargement && (
          <CarteOnboarding
            nombreProduits={kpis?.nombreProduits ?? 0}
            nombreEmplacements={kpis?.nombreEmplacements ?? 0}
            nomBoutique={boutiqueActive?.nom}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpisChargement ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px] rounded-xl" />
            ))
          ) : (
            <>
              <CarteKpi
                libelle="Recettes du jour"
                valeur={formatMontant(kpis?.recettesJour ?? 0)}
                unite="F CFA"
                icone={Banknote}
                classesIcone="bg-accent/10 text-accent"
              />
              <CarteKpi
                libelle="Tickets du jour"
                valeur={String(kpis?.ticketsJour ?? 0)}
                icone={Receipt}
                classesIcone="bg-warning/10 text-warning"
              />
              <CarteKpi
                libelle="Ticket moyen"
                valeur={formatMontant(kpis?.ticketMoyen ?? 0)}
                unite="F"
                icone={Coins}
                classesIcone="bg-success/10 text-success"
              />
              <CarteKpi
                libelle="Catalogue actif"
                valeur={String(kpis?.nombreProduits ?? 0)}
                icone={Package}
                classesIcone="bg-accent/10 text-accent"
              />
            </>
          )}
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Acces rapide
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LienRapide href="/pos" icone={ShoppingCart} libelle="Ouvrir la caisse" classesIcone="bg-accent/10 text-accent" />
            <LienRapide href="/catalogue" icone={Package} libelle="Gérer le catalogue" classesIcone="bg-warning/10 text-warning" />
            <LienRapide href="/stock" icone={Warehouse} libelle="Mouvements de stock" classesIcone="bg-success/10 text-success" />
            <LienRapide href="/rapports" icone={BarChart3} libelle="Consulter les rapports" classesIcone="bg-muted/10 text-muted" />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CourbeVentes donnees={ventes} enChargement={ventesChargement} />
          </div>

          <Card>
            <Card.Header>
              <Card.Title className="text-sm">Derniers tickets</Card.Title>
              <span className="ml-auto text-xs text-muted flex items-center gap-1">
                <MapPin size={12} />
                {kpis?.nombreEmplacements ?? 0} emplacement{(kpis?.nombreEmplacements ?? 0) > 1 ? "s" : ""}
              </span>
            </Card.Header>
            <Card.Content className="p-0">
              <HistoriqueTickets tickets={tickets} />
            </Card.Content>
          </Card>
        </div>
    </PageContainer>
  );
}
