"use client";

import { Avatar, Button, Kbd } from "@heroui/react";
import { Search, Bell } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function Topbar({ titre }: { titre?: string }) {
  const { utilisateur } = useAuth();
  const initiales = `${utilisateur?.prenom?.charAt(0) ?? ""}${utilisateur?.nomFamille?.charAt(0) ?? ""}`;

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-surface sticky top-0 z-10">
      <div className="flex items-center gap-2 lg:gap-4 min-w-0 pl-12 lg:pl-0">
        {titre && (
          <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">{titre}</h1>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted">
          <Search size={16} />
          <span>Rechercher...</span>
          <Kbd>/</Kbd>
        </div>

        <Button
          variant="ghost"
          className="p-2 h-auto min-w-0 text-muted"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </Button>

        <Avatar className="bg-accent text-accent-foreground text-xs font-semibold w-8 h-8">
          {initiales || "•"}
        </Avatar>
      </div>
    </header>
  );
}
