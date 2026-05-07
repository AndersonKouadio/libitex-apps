"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { catalogueAPI } from "@/features/catalogue/apis/catalogue.api";
import { stockAPI } from "@/features/stock/apis/stock.api";
import type { IKpiTableauDeBord } from "@/features/tableau-de-bord/types/dashboard.type";
import {
  Banknote, Receipt, Package, MapPin, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Warehouse, BarChart3, TrendingUp,
} from "lucide-react";

function formatXOF(montant: number): string {
  return new Intl.NumberFormat("fr-FR").format(montant);
}

function CarteKpi({
  libelle, valeur, unite, icone: Icone, couleur, tendance,
}: {
  libelle: string;
  valeur: string;
  unite?: string;
  icone: typeof Banknote;
  couleur: string;
  tendance?: { valeur: string; positive: boolean };
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${couleur} 12%, white)`, color: couleur }}
        >
          <Icone size={20} strokeWidth={1.8} />
        </div>
        {tendance && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${tendance.positive ? "text-emerald-600" : "text-red-500"}`}>
            {tendance.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {tendance.valeur}
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-500 mb-1">{libelle}</p>
      <p className="text-2xl font-semibold text-neutral-900 tabular-nums tracking-tight">
        {valeur}
        {unite && <span className="text-sm font-normal text-neutral-400 ml-1">{unite}</span>}
      </p>
    </div>
  );
}

function LienRapide({
  href, icone: Icone, libelle, couleur,
}: {
  href: string;
  icone: typeof ShoppingCart;
  libelle: string;
  couleur: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `color-mix(in srgb, ${couleur} 10%, white)`, color: couleur }}
      >
        <Icone size={18} strokeWidth={1.8} />
      </div>
      <span className="text-sm font-medium text-neutral-700">{libelle}</span>
    </a>
  );
}

export default function TableauDeBordPage() {
  const { token } = useAuth();
  const [kpis, setKpis] = useState<IKpiTableauDeBord | null>(null);

  useEffect(() => {
    if (!token) return;

    async function charger() {
      try {
        const [produits, emplacements] = await Promise.all([
          catalogueAPI.listerProduits(token!),
          stockAPI.listerEmplacements(token!),
        ]);

        setKpis({
          caJour: 0,
          ventesJour: 0,
          nombreProduits: produits?.data?.length ?? 0,
          nombreEmplacements: emplacements?.length ?? 0,
          ticketMoyen: 0,
        });
      } catch {
        // silencieux pour le dashboard
      }
    }

    charger();
  }, [token]);

  return (
    <>
      <Topbar titre="Tableau de bord" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Accueil nouveau commercant */}
        {kpis && kpis.nombreProduits === 0 && (
          <div className="mb-6 p-5 rounded-xl border border-accent/20 bg-accent/5">
            <p className="text-sm font-medium text-foreground">
              Bienvenue sur LIBITEX
            </p>
            <p className="text-sm text-muted mt-1">
              Commencez par ajouter vos produits dans le catalogue, puis recevez du stock pour pouvoir vendre.
            </p>
            <div className="flex gap-2 mt-3">
              <a href="/catalogue" className="text-sm font-medium text-accent hover:underline">
                Ajouter un produit
              </a>
              <span className="text-muted">puis</span>
              <a href="/stock" className="text-sm font-medium text-accent hover:underline">
                Recevoir du stock
              </a>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <CarteKpi
            libelle="Recettes du jour"
            valeur={formatXOF(kpis?.caJour ?? 0)}
            unite="F CFA"
            icone={Banknote}
            couleur="#0D9488"
          />
          <CarteKpi
            libelle="Tickets du jour"
            valeur={String(kpis?.ventesJour ?? 0)}
            icone={Receipt}
            couleur="#D97706"
          />
          <CarteKpi
            libelle="Articles en catalogue"
            valeur={String(kpis?.nombreProduits ?? 0)}
            icone={Package}
            couleur="#2563EB"
          />
          <CarteKpi
            libelle="Points de vente"
            valeur={String(kpis?.nombreEmplacements ?? 0)}
            icone={MapPin}
            couleur="#059669"
          />
        </div>

        {/* Acces rapide */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Acces rapide
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LienRapide href="/pos" icone={ShoppingCart} libelle="Ouvrir la caisse" couleur="#0D9488" />
            <LienRapide href="/catalogue" icone={Package} libelle="Gerer le catalogue" couleur="#2563EB" />
            <LienRapide href="/stock" icone={Warehouse} libelle="Mouvements de stock" couleur="#059669" />
            <LienRapide href="/rapports" icone={BarChart3} libelle="Consulter les rapports" couleur="#D97706" />
          </div>
        </div>

        {/* Section vide mais structuree */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-700">Ventes des 7 derniers jours</h3>
              <span className="text-xs text-neutral-400">Bientot disponible</span>
            </div>
            <div className="h-48 flex items-center justify-center">
              <div className="flex items-center gap-2 text-neutral-300">
                <TrendingUp size={20} />
                <span className="text-sm">Graphique en cours de developpement</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-700 mb-4">Derniers tickets</h3>
            <div className="space-y-3">
              <p className="text-sm text-neutral-400 text-center py-8">
                Les derniers tickets apparaitront ici
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
