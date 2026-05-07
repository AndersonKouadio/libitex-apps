"use client";

import { Search, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Topbar({ title }: { title?: string }) {
  const { user } = useAuth();

  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b bg-white"
      style={{ borderColor: "var(--color-neutral-200)" }}
    >
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-neutral-800)" }}>
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
          style={{
            borderColor: "var(--color-neutral-200)",
            color: "var(--color-neutral-500)",
          }}
        >
          <Search size={16} />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded bg-neutral-100">
            /
          </kbd>
        </div>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg hover:bg-neutral-100 relative"
          style={{ color: "var(--color-neutral-500)" }}
        >
          <Bell size={20} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: "var(--color-accent-600)" }}
          />
        </button>

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: "var(--color-accent-600)" }}
        >
          {user?.role?.charAt(0) || "U"}
        </div>
      </div>
    </header>
  );
}
