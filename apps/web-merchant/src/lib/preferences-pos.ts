"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "./storage-keys";

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

type Listener = (p: PreferencesPOS) => void;
const listeners = new Set<Listener>();

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
  for (const l of listeners) l(p);
}

export const preferencesPOS = {
  lire,
  modifier(patch: Partial<PreferencesPOS>): void {
    ecrire({ ...lire(), ...patch });
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

export function usePreferencesPOS(): PreferencesPOS {
  const [prefs, setPrefs] = useState<PreferencesPOS>(() => lire());
  useEffect(() => preferencesPOS.subscribe(setPrefs), []);
  return prefs;
}
