"use client";

import { Search, Bell } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function Topbar({ titre }: { titre?: string }) {
  const { utilisateur } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-200 bg-white">
      <div className="flex items-center gap-4">
        {titre && (
          <h1 className="text-lg font-semibold text-neutral-800">{titre}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-500">
          <Search size={16} />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded bg-neutral-100">/</kbd>
        </div>

        <button className="p-2 rounded-lg hover:bg-neutral-100 relative text-neutral-500">
          <Bell size={20} />
        </button>

        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-teal-600">
          {utilisateur?.prenom?.charAt(0)}{utilisateur?.nomFamille?.charAt(0)}
        </div>
      </div>
    </header>
  );
}
