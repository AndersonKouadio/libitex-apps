"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const STORAGE_KEY = STORAGE_KEYS.POS_OFFLINE_QUEUE;

/**
 * Une vente mise en attente hors-ligne. payloadCreer contient le DTO du POST
 * /vente/tickets, paiements ceux du POST /completer. total/monnaie sont
 * calcules au moment de l'encaissement (le caissier voit la monnaie a rendre
 * meme offline) et conserves pour ressortir la confirmation telle quelle.
 */
export interface VenteOffline {
  id: string;
  emplacementId: string;
  payloadCreer: {
    emplacementId: string;
    remiseGlobale?: number;
    raisonRemise?: string;
    clientId?: string;
    nomClient?: string;
    telephoneClient?: string;
    note?: string;
    lignes: {
      varianteId: string;
      quantite: number;
      remise?: number;
      numeroSerie?: string;
      supplements?: { supplementId: string; quantite: number }[];
    }[];
  };
  paiements: { methode: string; montant: number; reference?: string }[];
  total: number;
  monnaie: number;
  numeroLocal: string;
  creeLe: string;
  derniereTentative?: string;
  erreur?: string;
}

type Listener = (file: VenteOffline[]) => void;
const listeners = new Set<Listener>();

function lire(): VenteOffline[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VenteOffline[];
  } catch {
    return [];
  }
}

function ecrire(file: VenteOffline[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  for (const l of listeners) l(file);
}

export const fileOffline = {
  lister: lire,

  ajouter(vente: VenteOffline): void {
    const file = lire();
    file.push(vente);
    ecrire(file);
  },

  retirer(id: string): void {
    ecrire(lire().filter((v) => v.id !== id));
  },

  marquerErreur(id: string, message: string): void {
    ecrire(lire().map((v) =>
      v.id === id
        ? { ...v, erreur: message, derniereTentative: new Date().toISOString() }
        : v,
    ));
  },

  reinitialiserErreurs(): void {
    ecrire(lire().map((v) => ({ ...v, erreur: undefined })));
  },

  reessayer(id: string): void {
    ecrire(lire().map((v) => (
      v.id === id ? { ...v, erreur: undefined } : v
    )));
  },

  vider(): void {
    ecrire([]);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Hook React qui se re-render quand la file evolue (ajout, retrait, erreur).
 */
export function useFileOffline(): VenteOffline[] {
  const [file, setFile] = useState<VenteOffline[]>(() => lire());
  useEffect(() => fileOffline.subscribe(setFile), []);
  return file;
}

/**
 * Genere un numero local sequentiel ("H-001", "H-002"...) pour distinguer
 * les ventes offline dans la confirmation et l'impression.
 */
export function prochainNumeroLocal(): string {
  const file = lire();
  const nums = file
    .map((v) => Number(v.numeroLocal.replace(/^H-/, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `H-${String(max + 1).padStart(3, "0")}`;
}
