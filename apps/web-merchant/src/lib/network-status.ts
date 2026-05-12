"use client";

import { useEffect, useState } from "react";
import { createListenerSet } from "./listener-set";

/**
 * Etat reseau partage de l'app. Combine :
 * - navigator.onLine + events online/offline (rapide mais menteur en wifi
 *   sans internet : navigator dit "online" si l'interface est UP meme si
 *   l'API est injoignable)
 * - signaux de httpClient : marquerOffline() appele quand une requete echoue
 *   avec un TypeError reseau, marquerOnline() quand une requete reussit
 *
 * Resultat : on bascule offline des qu'une vraie requete echoue, et online
 * des qu'une autre passe. Le banner POS reflete cet etat.
 */

const store = createListenerSet<boolean>();
let etatActuel = typeof navigator !== "undefined" ? navigator.onLine : true;

export function marquerOnline(): void {
  if (etatActuel) return;
  etatActuel = true;
  store.emit(etatActuel);
}

export function marquerOffline(): void {
  if (!etatActuel) return;
  etatActuel = false;
  store.emit(etatActuel);
}

export function estEnLigne(): boolean {
  return etatActuel;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", marquerOnline);
  window.addEventListener("offline", marquerOffline);
}

export function useNetworkStatus(): boolean {
  const [enLigne, setEnLigne] = useState<boolean>(etatActuel);
  useEffect(() => store.subscribe(setEnLigne), []);
  return enLigne;
}
