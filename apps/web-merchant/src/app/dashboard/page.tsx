"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/lib/auth-context";
import { pos, stock, catalog } from "@/lib/api";
import {
  ShoppingCart, Package, Warehouse, TrendingUp,
  DollarSign, AlertTriangle,
} from "lucide-react";

interface DashboardData {
  todayRevenue: number;
  todayTickets: number;
  totalProducts: number;
  locations: number;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-5 flex items-start gap-4" style={{ borderColor: "var(--color-neutral-200)" }}>
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, color }}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm" style={{ color: "var(--color-neutral-500)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--color-neutral-800)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: "var(--color-neutral-400)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [products, locations] = await Promise.all([
          catalog.listProducts(token),
          stock.listLocations(token),
        ]);

        let todayRevenue = 0;
        let todayTickets = 0;

        // Try to get Z report for each location
        for (const loc of locations) {
          try {
            const zr = await pos.zReport(token, loc.id);
            todayRevenue += zr.summary.totalRevenue;
            todayTickets += zr.summary.totalTickets;
          } catch {}
        }

        setData({
          todayRevenue,
          todayTickets,
          totalProducts: products.data?.length ?? 0,
          locations: locations.length,
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    })();
  }, [token]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="CA du Jour"
            value={data ? fmt(data.todayRevenue) : "..."}
            icon={DollarSign}
            color="var(--color-accent-600)"
            sub="Chiffre d'affaires"
          />
          <KpiCard
            label="Ventes du Jour"
            value={data ? String(data.todayTickets) : "..."}
            icon={ShoppingCart}
            color="var(--color-warm-500)"
            sub="Tickets completes"
          />
          <KpiCard
            label="Produits"
            value={data ? String(data.totalProducts) : "..."}
            icon={Package}
            color="var(--color-info)"
            sub="Catalogue actif"
          />
          <KpiCard
            label="Points de Vente"
            value={data ? String(data.locations) : "..."}
            icon={Warehouse}
            color="var(--color-success)"
            sub="Emplacements"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "var(--color-neutral-200)" }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-neutral-800)" }}>
            Actions rapides
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/pos", label: "Ouvrir le POS", icon: ShoppingCart, color: "var(--color-accent-600)" },
              { href: "/catalog", label: "Ajouter un produit", icon: Package, color: "var(--color-info)" },
              { href: "/stock", label: "Reception stock", icon: Warehouse, color: "var(--color-success)" },
              { href: "/reports", label: "Z de caisse", icon: TrendingUp, color: "var(--color-warm-500)" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border text-center hover:shadow-md transition-shadow"
                style={{ borderColor: "var(--color-neutral-200)" }}
              >
                <action.icon size={24} style={{ color: action.color }} />
                <span className="text-sm font-medium" style={{ color: "var(--color-neutral-700)" }}>
                  {action.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
