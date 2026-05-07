"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, enChargement } = useAuth();
  const router = useRouter();
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

  useEffect(() => {
    if (!enChargement && !token) router.push("/");
  }, [enChargement, token, router]);

  if (enChargement || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay mobile */}
      {menuMobileOuvert && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMenuMobileOuvert(false)}
        />
      )}

      {/* Sidebar : cachee sur mobile, visible sur desktop */}
      <div className={`fixed z-40 transition-transform duration-200 lg:translate-x-0 ${
        menuMobileOuvert ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar onNavigate={() => setMenuMobileOuvert(false)} />
      </div>

      {/* Bouton hamburger mobile */}
      <button
        onClick={() => setMenuMobileOuvert(true)}
        className="fixed top-3.5 left-3 z-20 p-2 rounded-lg bg-surface border border-border shadow-sm lg:hidden"
      >
        <Menu size={20} className="text-foreground" />
      </button>

      <main className="flex-1 lg:ml-[256px] min-h-screen">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
