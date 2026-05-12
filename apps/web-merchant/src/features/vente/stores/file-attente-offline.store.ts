"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { createListenerSet } from "@/lib/listener-set";

const STORAGE_KEY = STORAGE_KEYS.POS_OFFLINE_QUEUE;
/**
 * Cle stockant le compteur atomique de numero local. Increment via
 * lecture+ecriture synchrone (single-threaded JS garantit l'atomicite).
 * Fix C3 : evite la collision en cas de double-encaissement rapide.
 */
const STORAGE_KEY_COUNTER = STORAGE_KEYS.POS_OFFLINE_COUNTER;

/**
 * Plafond de la queue. Si on l'atteint, on rejette les nouveaux ajouts
 * avec une erreur explicite. Le caissier doit synchroniser ou vider la
 * file avant de continuer.
 * Fix C5 : evite le crash localStorage (~5-10 MB).
 */
export const LIMITE_QUEUE = 200;

/**
 * Une vente mise en attente hors-ligne. payloadCreer contient le DTO du POST
 * /vente/tickets, paiements ceux du POST /completer. total/monnaie sont
 * calcules au moment de l'encaissement (le caissier voit la monnaie a rendre
 * meme offline) et conserves pour ressortir la confirmation telle quelle.
 *
 * tenantId est verrouille au moment de la creation (fix C2). Le drain
 * verifiera qu'il correspond au tenant actif avant de syncher : evite
 * qu'une vente faite sur boutique A soit syncee sur boutique B si le
 * caissier a switch entre temps.
 *
 * idempotencyKey est envoye au backend pour eviter les doublons en cas
 * de drain interrompu apres creerTicket mais avant completerTicket
 * (fix C4). Le backend retourne le ticket existant si la cle est deja
 * vue.
 */
export interface VenteOffline {
  id: string;
  /** Identique a `id` — duplique pour servir d'IdempotencyKey backend. */
  idempotencyKey: string;
  tenantId: string;
  emplacementId: string;
  payloadCreer: {
    emplacementId: string;
    remiseGlobale?: number;
    raisonRemise?: string;
    clientId?: string;
    nomClient?: string;
    telephoneClient?: string;
    note?: string;
    /** Renvoye au backend pour idempotence (anti-doublon a la sync). */
    idempotencyKey?: string;
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
  /** Compteur de tentatives de sync — utile pour stopper apres N. */
  tentativesNb?: number;
  erreur?: string;
}

const store = createListenerSet<VenteOffline[]>();

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
  store.emit(file);
}

/**
 * UUID v4 cryptographique. Fallback : crypto.getRandomValues si
 * randomUUID indisponible (vieux Safari). Pas de Math.random pour
 * eviter les collisions a haute frequence (fix I6).
 */
function genererId(): string {
  if (typeof crypto === "undefined") {
    // Fallback ultime — ne devrait jamais se declencher en HTTPS.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  // randomUUID dispo (HTTPS, Node 19+, Chrome 92+, Safari 15.4+).
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback : forge un UUID v4 a partir de 16 bytes aleatoires (RFC 4122).
  if (typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class QueuePleineException extends Error {
  constructor() {
    super(`File offline pleine (${LIMITE_QUEUE} ventes). Synchronisez ou videz avant d'ajouter.`);
    this.name = "QueuePleineException";
  }
}

export const fileOffline = {
  lister: lire,

  /**
   * Ajoute une vente. Throw QueuePleineException si la limite est atteinte.
   * tenantId / idempotencyKey doivent etre fournis par l'appelant.
   */
  ajouter(vente: VenteOffline): void {
    const file = lire();
    if (file.length >= LIMITE_QUEUE) {
      throw new QueuePleineException();
    }
    file.push(vente);
    ecrire(file);
  },

  retirer(id: string): void {
    ecrire(lire().filter((v) => v.id !== id));
  },

  marquerErreur(id: string, message: string): void {
    ecrire(lire().map((v) =>
      v.id === id
        ? {
            ...v,
            erreur: message,
            derniereTentative: new Date().toISOString(),
            tentativesNb: (v.tentativesNb ?? 0) + 1,
          }
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

  /**
   * Filtre la queue par tenant (fix C2). Utilise au drain pour ne pas
   * synchroniser les ventes d'un autre tenant.
   */
  listerPourTenant(tenantId: string): VenteOffline[] {
    return lire().filter((v) => v.tenantId === tenantId);
  },

  subscribe: store.subscribe,

  /**
   * Compteur de numero local atomique (fix C3). Lit la valeur courante,
   * l'incremente, ecrit et retourne. JS single-threaded -> deux appels
   * consecutifs auront des valeurs distinctes.
   *
   * Pas de reset automatique pour eviter les collisions sur l'historique.
   */
  prochainNumeroLocal(): string {
    if (typeof window === "undefined") return "H-001";
    const raw = localStorage.getItem(STORAGE_KEY_COUNTER);
    const courant = raw ? Number(raw) : 0;
    const suivant = (Number.isFinite(courant) ? courant : 0) + 1;
    localStorage.setItem(STORAGE_KEY_COUNTER, String(suivant));
    return `H-${String(suivant).padStart(3, "0")}`;
  },

  /** Helper UUID expose pour les call-sites (useEncaissement). */
  genererId,
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
 * Hook filtre par tenant. Utilise par les composants UI pour eviter
 * d'afficher les ventes d'un autre tenant si le user a switche.
 */
export function useFileOfflineTenant(tenantId: string | null | undefined): VenteOffline[] {
  const all = useFileOffline();
  if (!tenantId) return [];
  return all.filter((v) => v.tenantId === tenantId);
}

/**
 * Ancienne signature gardee pour compat — utilise le compteur atomique.
 * @deprecated Utilisez fileOffline.prochainNumeroLocal()
 */
export function prochainNumeroLocal(): string {
  return fileOffline.prochainNumeroLocal();
}
