"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "./storage-keys";
import { createListenerSet } from "./listener-set";

/**
 * Preferences POS persistees en localStorage. Reactives via useEffect +
 * event 'storage' (multi-tab) ou listener interne (meme tab).
 */
export interface PreferencesPOS {
  /** Imprimer automatiquement le ticket apres encaissement reussi. */
  imprimerAuto: boolean;
}

const STORAGE_KEY = STORAGE_KEYS.POS_PREFS;
const DEFAUT: PreferencesPOS = { imprimerAuto: false };
const store = createListenerSet<PreferencesPOS>();

function lire(): PreferencesPOS {
  if (typeof window === "undefined") return DEFAUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAUT;
    return { ...DEFAUT, ...(JSON.parse(raw) as Partial<PreferencesPOS>) };
  } catch {
    return DEFAUT;
  }
}

function ecrire(p: PreferencesPOS): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  store.emit(p);
}

export const preferencesPOS = {
  lire,
  modifier(patch: Partial<PreferencesPOS>): void {
    ecrire({ ...lire(), ...patch });
  },
  subscribe: store.subscribe,
};

export function usePreferencesPOS(): PreferencesPOS {
  const [prefs, setPrefs] = useState<PreferencesPOS>(() => lire());
  useEffect(() => store.subscribe(setPrefs), []);
  return prefs;
}
