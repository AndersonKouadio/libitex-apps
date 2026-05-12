"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "./storage-keys";
import { createListenerSet } from "./listener-set";

export type Theme = "light" | "dark";

const STORAGE_KEY = STORAGE_KEYS.THEME;
const store = createListenerSet<Theme>();

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
  store.emit(t);
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(lire());
    return store.subscribe(setThemeState);
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
