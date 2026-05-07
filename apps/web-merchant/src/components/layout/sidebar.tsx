"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const ITEMS_NAV = [
  { href: "/dashboard", libelle: "Tableau de bord", icone: LayoutDashboard },
  { href: "/pos", libelle: "Point de vente", icone: ShoppingCart },
  { href: "/catalogue", libelle: "Catalogue", icone: Package },
  { href: "/stock", libelle: "Stock", icone: Warehouse },
  { href: "/clients", libelle: "Clients", icone: Users },
  { href: "/rapports", libelle: "Rapports", icone: BarChart3 },
  { href: "/parametres", libelle: "Parametres", icone: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { deconnecter, utilisateur } = useAuth();
  const [replie, setReplie] = useState(false);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col z-40 transition-[width] duration-200 ${
        replie ? "w-[72px]" : "w-[256px]"
      }`}
      style={{ background: "oklch(0.18 0.02 280)" }}
    >
      {/* En-tete */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/8">
        {!replie && (
          <span className="text-xl font-bold tracking-tight" style={{ color: "oklch(0.75 0.17 175)" }}>
            LIBITEX
          </span>
        )}
        {replie && (
          <span className="text-xl font-bold mx-auto" style={{ color: "oklch(0.75 0.17 175)" }}>L</span>
        )}
        <button
          onClick={() => setReplie(!replie)}
          className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 transition-colors"
        >
          {replie ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {ITEMS_NAV.map((item) => {
          const actif = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                actif
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:text-white/75 hover:bg-white/5"
              }`}
            >
              <Icone size={18} strokeWidth={actif ? 2 : 1.6} />
              {!replie && <span>{item.libelle}</span>}
              {actif && (
                <span
                  className="absolute left-0 w-[3px] h-5 rounded-r-full"
                  style={{ background: "oklch(0.75 0.17 175)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pied */}
      <div className="px-2.5 py-3 border-t border-white/8">
        {!replie && utilisateur && (
          <div className="px-3 mb-2">
            <p className="text-xs text-white/35 truncate">
              {utilisateur.prenom} {utilisateur.nomFamille}
            </p>
            <p className="text-[10px] text-white/20 uppercase tracking-wider mt-0.5">
              {utilisateur.role}
            </p>
          </div>
        )}
        <button
          onClick={deconnecter}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/35 hover:text-white/60 hover:bg-white/5 w-full transition-colors"
        >
          <LogOut size={18} strokeWidth={1.6} />
          {!replie && <span>Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
