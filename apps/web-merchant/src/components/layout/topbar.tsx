"use client";

import { Avatar, Button, Kbd } from "@heroui/react";
import { Search, Bell } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function Topbar({ titre }: { titre?: string }) {
  const { utilisateur } = useAuth();
  const initiales = `${utilisateur?.prenom?.charAt(0) ?? ""}${utilisateur?.nomFamille?.charAt(0) ?? ""}`;

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface">
      <div className="flex items-center gap-4">
        {titre && <h1 className="text-lg font-semibold text-foreground">{titre}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted">
          <Search size={16} />
          <span>Rechercher...</span>
          <Kbd>/</Kbd>
        </div>

        <Button variant="ghost" className="p-2 h-auto min-w-0 text-muted" aria-label="Notifications">
          <Bell size={20} />
        </Button>

        <Avatar className="bg-accent text-accent-foreground text-xs font-semibold">
          {initiales || "•"}
        </Avatar>
      </div>
    </header>
  );
}
