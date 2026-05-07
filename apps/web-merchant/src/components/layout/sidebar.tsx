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
  { href: "/pos", libelle: "Point de vente", icone: ShoppingCart, accent: true },
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
      className={`fixed top-0 left-0 h-screen flex flex-col bg-[#1B1F3B] z-40 transition-[width] duration-200 ${
        replie ? "w-[72px]" : "w-[256px]"
      }`}
    >
      {/* En-tete */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
        {!replie && (
          <span className="text-xl font-bold text-teal-400 tracking-tight">LIBITEX</span>
        )}
        {replie && (
          <span className="text-xl font-bold text-teal-400 mx-auto">L</span>
        )}
        <button
          onClick={() => setReplie(!replie)}
          className="p-1 rounded hover:bg-white/10 text-white/50"
        >
          {replie ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {ITEMS_NAV.map((item) => {
          const actif = pathname.startsWith(item.href);
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                actif
                  ? "bg-[#2D3561] text-white border-l-[3px] border-teal-400"
                  : item.accent
                  ? "text-teal-400 hover:bg-white/5"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icone size={20} strokeWidth={1.8} />
              {!replie && <span>{item.libelle}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Pied */}
      <div className="px-3 py-4 border-t border-white/10">
        {!replie && utilisateur && (
          <div className="px-3 mb-2">
            <p className="text-xs text-white/30 truncate">
              {utilisateur.prenom} {utilisateur.nomFamille}
            </p>
            <p className="text-[10px] text-white/20 uppercase tracking-wider">
              {utilisateur.role}
            </p>
          </div>
        )}
        <button
          onClick={deconnecter}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 w-full transition-colors"
        >
          <LogOut size={20} strokeWidth={1.8} />
          {!replie && <span>Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
