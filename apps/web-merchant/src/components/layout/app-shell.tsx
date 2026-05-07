"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { Menu } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Sidebar } from "./sidebar";
import { BottomNavMobile } from "./bottom-nav-mobile";

interface Props {
  children: React.ReactNode;
  /** true pour les pages plein ecran (POS) — pas de bottom nav, pas de padding */
  pleinEcran?: boolean;
}

export function AppShell({ children, pleinEcran = false }: Props) {
  const { token, enChargement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  useEffect(() => {
    if (!enChargement && !token) router.push("/");
  }, [enChargement, token, router]);

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
    <div className="min-h-screen flex bg-background">
      {tiroirOuvert && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 bg-foreground/40 z-30 lg:hidden"
          onClick={() => setTiroirOuvert(false)}
        />
      )}

      <div
        className={`fixed z-40 transition-transform duration-200 lg:translate-x-0 ${
          tiroirOuvert ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setTiroirOuvert(false)} />
      </div>

      {!pleinEcran && (
        <Button
          variant="ghost"
          className="fixed top-3.5 left-3 z-20 p-2 h-auto min-w-0 bg-surface border border-border shadow-sm lg:hidden"
          onPress={() => setTiroirOuvert(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} className="text-foreground" />
        </Button>
      )}

      <main className={`flex-1 lg:ml-[256px] min-h-screen ${pleinEcran ? "" : "pb-20 lg:pb-0"}`}>
        <div className="w-full">{children}</div>
      </main>

      {!pleinEcran && <BottomNavMobile onPlus={() => setTiroirOuvert(true)} />}
    </div>
  );
}
