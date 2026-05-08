"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNavMobile } from "./bottom-nav-mobile";

interface Props {
  children: React.ReactNode;
  /** true pour les pages plein écran (POS) — pas de bottom nav, pas de padding */
  pleinEcran?: boolean;
}

export function AppShell({ children, pleinEcran = false }: Props) {
  const { token, enChargement, utilisateur } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  useEffect(() => {
    if (!enChargement && !token) router.push("/");
  }, [enChargement, token, router]);

  // Force le changement de mot de passe pour les comptes nouvellement invites
  useEffect(() => {
    if (!enChargement && token && utilisateur?.mustChangePassword) {
      router.push("/changer-mot-de-passe");
    }
  }, [enChargement, token, utilisateur?.mustChangePassword, router]);

  // Fermer le tiroir lors d'un changement de route
  useEffect(() => {
    setTiroirOuvert(false);
  }, [pathname]);

  if (enChargement || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Overlay mobile (clic en dehors pour fermer) */}
      {tiroirOuvert && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 bg-foreground/40 z-30 lg:hidden"
          onClick={() => setTiroirOuvert(false)}
        />
      )}

      {/* Sidebar — fixe a gauche */}
      <aside
        className={`fixed top-0 left-0 z-40 transition-transform duration-200 lg:translate-x-0 ${
          tiroirOuvert ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setTiroirOuvert(false)} />
      </aside>

      {/* Contenu principal : Topbar (avec breadcrumbs) + page */}
      <div className={`min-h-screen flex flex-col lg:ml-[256px] ${pleinEcran ? "" : "pb-20 lg:pb-0"}`}>
        {!pleinEcran && <Topbar />}
        <main className="flex-1">{children}</main>
      </div>

      {/* Bottom nav mobile (sauf POS) */}
      {!pleinEcran && <BottomNavMobile onPlus={() => setTiroirOuvert(true)} />}
    </div>
  );
}
