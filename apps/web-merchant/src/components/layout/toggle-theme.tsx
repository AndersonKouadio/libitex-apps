"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

/**
 * Bouton bascule clair/sombre. Le toggle est instantane et persiste en
 * localStorage (lib/theme). Le script inline du RootLayout applique le
 * theme avant hydration -> pas de flash light->dark au refresh.
 */
export function ToggleTheme({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const sombre = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={sombre ? "Basculer en mode clair" : "Basculer en mode sombre"}
      title={sombre ? "Mode clair" : "Mode sombre"}
      className={`h-9 w-9 inline-flex items-center justify-center rounded-md text-foreground hover:bg-surface-secondary transition-colors ${className}`}
    >
      {sombre ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
