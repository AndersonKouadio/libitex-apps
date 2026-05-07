"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SwitcherBoutique } from "@/features/boutique/components/switcher-boutique";

const NAV_ERP = [
  { href: "/dashboard", libelle: "Tableau de bord", icone: LayoutDashboard },
  { href: "/catalogue", libelle: "Catalogue", icone: Package },
  { href: "/stock", libelle: "Stock", icone: Warehouse },
  { href: "/clients", libelle: "Clients", icone: Users },
  { href: "/rapports", libelle: "Rapports", icone: BarChart3 },
  { href: "/parametres", libelle: "Paramètres", icone: Settings },
];

function ModeSwitch({ modePOS, onSwitch, replie }: {
  modePOS: boolean;
  onSwitch: () => void;
  replie: boolean;
}) {
  return (
    <div className="px-2.5 py-3">
      <Button
        variant="ghost"
        className="w-full rounded-xl p-1 bg-sidebar-mute h-auto justify-stretch hover:bg-sidebar-mute"
        onPress={onSwitch}
        aria-label={modePOS ? "Basculer en mode gestion" : "Basculer en mode caisse"}
      >
        <span
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            !modePOS ? "bg-white/10 text-white shadow-sm" : "text-white/35"
          }`}
        >
          <Monitor size={14} strokeWidth={!modePOS ? 2 : 1.5} />
          {!replie && <span>Gestion</span>}
        </span>
        <span
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            modePOS ? "bg-accent text-accent-foreground shadow-sm" : "text-white/35"
          }`}
        >
          <ShoppingCart size={14} strokeWidth={modePOS ? 2 : 1.5} />
          {!replie && <span>Caisse</span>}
        </span>
      </Button>
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
    router.push(modePOS ? "/dashboard" : "/pos");
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col z-40 bg-sidebar transition-[width] duration-200 ${
        replie ? "w-[72px]" : "w-[256px]"
      }`}
    >
      <div className="flex items-center justify-between px-5 h-14">
        {!replie && (
          <span className="text-lg font-bold tracking-tight text-accent">LIBITEX</span>
        )}
        {replie && <span className="text-lg font-bold mx-auto text-accent">L</span>}
        <Button
          variant="ghost"
          className="p-1.5 h-auto min-w-0 text-white/40 hover:bg-white/10"
          onPress={() => setReplie(!replie)}
          aria-label={replie ? "Deplier la barre laterale" : "Replier la barre laterale"}
        >
          {replie ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      <div className="px-2.5 pb-1">
        <SwitcherBoutique replie={replie} />
      </div>

      <ModeSwitch modePOS={modePOS} onSwitch={basculerMode} replie={replie} />

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
                  actif ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {actif && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent" />
                )}
                <Icone size={18} strokeWidth={actif ? 1.8 : 1.5} />
                {!replie && <span>{item.libelle}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      {modePOS && <div className="flex-1" />}

      <div className="px-2.5 py-3 border-t border-white/10">
        {!replie && utilisateur && (
          <div className="px-3 mb-2">
            <p className="text-xs text-white/40 truncate">
              {utilisateur.prenom} {utilisateur.nomFamille}
            </p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
              {utilisateur.role}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2 h-auto text-[13px] text-white/40 hover:text-white/70 hover:bg-white/5"
          onPress={deconnecter}
        >
          <LogOut size={18} strokeWidth={1.5} />
          {!replie && <span>Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}
