"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "libitex_theme";

type Listener = (t: Theme) => void;
const listeners = new Set<Listener>();

function lire(): Theme {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "dark" || v === "light") return v;
  return "light";
}

function appliquer(t: Theme): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.dataset.theme = t;
  html.classList.remove("light", "dark");
  html.classList.add(t);
}

export function definirTheme(t: Theme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, t);
  appliquer(t);
  for (const l of listeners) l(t);
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(lire());
    const l: Listener = (t) => setThemeState(t);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  return {
    theme,
    setTheme: definirTheme,
    toggle: () => definirTheme(theme === "light" ? "dark" : "light"),
  };
}

/**
 * Script inline injecte dans <head> qui applique le theme AVANT hydration
 * React. Evite le flash blanc -> sombre quand le user est en dark mode.
 * Doit etre passe en string a dangerouslySetInnerHTML dans le layout root.
 */
export const SCRIPT_INIT_THEME = `
(function() {
  try {
    var t = localStorage.getItem("${STORAGE_KEY}");
    if (t !== "dark" && t !== "light") t = "light";
    var html = document.documentElement;
    html.setAttribute("data-theme", t);
    html.classList.add(t);
  } catch (e) {}
})();
`;
