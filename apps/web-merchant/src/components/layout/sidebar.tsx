"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Monitor,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const NAV_ERP = [
  { href: "/dashboard", libelle: "Tableau de bord", icone: LayoutDashboard },
  { href: "/catalogue", libelle: "Catalogue", icone: Package },
  { href: "/stock", libelle: "Stock", icone: Warehouse },
  { href: "/clients", libelle: "Clients", icone: Users },
  { href: "/rapports", libelle: "Rapports", icone: BarChart3 },
  { href: "/parametres", libelle: "Parametres", icone: Settings },
];

function ModeSwitch({ modePOS, onSwitch, replie }: {
  modePOS: boolean;
  onSwitch: () => void;
  replie: boolean;
}) {
  return (
    <div className="px-2.5 py-3">
      <button
        onClick={onSwitch}
        className="w-full rounded-xl p-1 flex items-center transition-colors"
        style={{ background: "oklch(0.15 0.015 280)" }}
      >
        {/* Option ERP */}
        <div
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            !modePOS
              ? "bg-white/12 text-white shadow-sm"
              : "text-white/35"
          }`}
        >
          <Monitor size={14} strokeWidth={!modePOS ? 2 : 1.5} />
          {!replie && <span>Gestion</span>}
        </div>
        {/* Option POS */}
        <div
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            modePOS
              ? "text-white shadow-sm"
              : "text-white/35"
          }`}
          style={modePOS ? { background: "oklch(0.55 0.17 175)" } : undefined}
        >
          <ShoppingCart size={14} strokeWidth={modePOS ? 2 : 1.5} />
          {!replie && <span>Caisse</span>}
        </div>
      </button>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { deconnecter, utilisateur } = useAuth();
  const [replie, setReplie] = useState(false);

  const modePOS = pathname === "/pos" || pathname.startsWith("/pos/");

  function basculerMode() {
    if (modePOS) {
      router.push("/dashboard");
    } else {
      router.push("/pos");
    }
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col z-40 transition-[width] duration-200 ${
        replie ? "w-[72px]" : "w-[256px]"
      }`}
      style={{ background: "oklch(0.18 0.02 280)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14">
        {!replie && (
          <span className="text-lg font-bold tracking-tight" style={{ color: "oklch(0.75 0.17 175)" }}>
            LIBITEX
          </span>
        )}
        {replie && (
          <span className="text-lg font-bold mx-auto" style={{ color: "oklch(0.75 0.17 175)" }}>L</span>
        )}
        <button
          onClick={() => setReplie(!replie)}
          className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 transition-colors"
        >
          {replie ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Switch Gestion / Caisse */}
      <ModeSwitch modePOS={modePOS} onSwitch={basculerMode} replie={replie} />

      {/* Navigation ERP (masquee en mode POS) */}
      {!modePOS && (
        <nav className="flex-1 py-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ERP.map((item) => {
            const actif = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icone = item.icone;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  actif
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {actif && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                    style={{ background: "oklch(0.75 0.17 175)" }}
                  />
                )}
                <Icone size={18} strokeWidth={actif ? 1.8 : 1.5} />
                {!replie && <span>{item.libelle}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      {/* En mode POS, espace vide pour garder le layout */}
      {modePOS && <div className="flex-1" />}

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
          <LogOut size={18} strokeWidth={1.5} />
          {!replie && <span>Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
