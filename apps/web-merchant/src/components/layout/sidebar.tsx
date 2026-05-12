"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Monitor, History, Truck, CalendarCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SwitcherBoutique } from "@/features/boutique/components/switcher-boutique";
import { useAlertesResumeQuery } from "@/features/stock/queries/alertes-resume.query";
import { SidebarPOS } from "./sidebar-pos";

interface ItemNav {
  href: string;
  libelle: string;
  icone: typeof LayoutDashboard;
  visibleSi?: (secteur: string | undefined) => boolean;
  /** Routes additionnelles qui doivent rendre cet item actif. */
  routesActives?: string[];
}

const NAV_ERP: ItemNav[] = [
  { href: "/dashboard", libelle: "Tableau de bord", icone: LayoutDashboard },
  {
    href: "/catalogue",
    libelle: "Catalogue",
    icone: Package,
    routesActives: ["/categories", "/ingredients", "/supplements"],
  },
  { href: "/stock", libelle: "Stock", icone: Warehouse },
  {
    href: "/achats",
    libelle: "Achats",
    icone: Truck,
    routesActives: ["/achats/fournisseurs", "/achats/commandes"],
  },
  { href: "/clients", libelle: "Clients", icone: Users },
  {
    href: "/reservations",
    libelle: "Reservations",
    icone: CalendarCheck,
    // Reserve aux secteurs de service a table (resto, bar...). Cache pour
    // les autres secteurs ou ca n'a pas de sens (alimentaire, vetement...).
    visibleSi: (secteur) => secteur === "RESTAURATION",
  },
  { href: "/rapports", libelle: "Rapports", icone: BarChart3 },
  { href: "/sessions-caisse", libelle: "Sessions caisse", icone: History },
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
            !modePOS ? "bg-white/10 text-white shadow-sm" : "text-white/55"
          }`}
        >
          <Monitor size={14} strokeWidth={!modePOS ? 2 : 1.5} />
          {!replie && <span>Gestion</span>}
        </span>
        <span
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            modePOS ? "bg-accent text-accent-foreground shadow-sm" : "text-white/55"
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
  const { deconnecter, utilisateur, boutiqueActive } = useAuth();
  const [replie, setReplie] = useState(false);
  const { data: alertes } = useAlertesResumeQuery();
  // Total = ruptures + alertes. Si > 0, on affiche le badge sur l'entree
  // Stock. Permet au gestionnaire de voir d'un coup d'œil qu'il y a a
  // faire sans devoir naviguer.
  const nbAlertesStock = (alertes?.nbAlertes ?? 0) + (alertes?.nbRuptures ?? 0);

  const modePOS = pathname === "/pos" || pathname.startsWith("/pos/");

  function basculerMode() {
    router.push(modePOS ? "/dashboard" : "/pos");
  }

  return (
    <aside
      className={`h-screen flex flex-col bg-sidebar transition-[width] duration-200 ${
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
          className="p-1.5 h-auto min-w-0 text-white/55 hover:bg-white/10"
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
          {NAV_ERP.filter((item) => !item.visibleSi || item.visibleSi(boutiqueActive?.secteurActivite)).map((item) => {
            const routes = [item.href, ...(item.routesActives ?? [])];
            const actif = routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
            const Icone = item.icone;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  actif ? "bg-white/10 text-white" : "text-white/55 hover:text-white/85 hover:bg-white/5"
                }`}
              >
                {actif && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--color-accent-400)]" />
                )}
                <Icone size={18} strokeWidth={actif ? 1.8 : 1.5} />
                {!replie && <span className="flex-1">{item.libelle}</span>}
                {!replie && item.href === "/stock" && nbAlertesStock > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-warning text-warning-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {nbAlertesStock > 99 ? "99+" : nbAlertesStock}
                  </span>
                )}
                {replie && item.href === "/stock" && nbAlertesStock > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-warning text-warning-foreground text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {nbAlertesStock > 9 ? "9+" : nbAlertesStock}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {modePOS && <SidebarPOS replie={replie} />}

      <div className="px-2.5 py-3 border-t border-white/10">
        {!replie && utilisateur && (
          <div className="px-3 mb-2">
            <p className="text-xs text-white/70 truncate">
              {utilisateur.prenom} {utilisateur.nomFamille}
            </p>
            <p className="text-[10px] text-white/55 uppercase tracking-wider mt-0.5">
              {utilisateur.role}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2 h-auto text-[13px] text-white/65 hover:text-white/85 hover:bg-white/5"
          onPress={deconnecter}
        >
          <LogOut size={18} strokeWidth={1.5} />
          {!replie && <span>Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}
