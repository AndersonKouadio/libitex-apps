"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useSyncOffline, type EtatDrain } from "@/features/vente/hooks/useSyncOffline";
import { BannerHorsLigne } from "@/components/layout/banner-hors-ligne";
import { ModalFileOffline } from "@/components/layout/modal-file-offline";

const ETAT_INITIAL: EtatDrain = { enCours: false, traites: 0, total: 0 };

const SyncOfflineContext = createContext<EtatDrain>(ETAT_INITIAL);

/** Hook consumer : etat du drain courant (utile pour le banner avec progression). */
export function useEtatDrain(): EtatDrain {
  return useContext(SyncOfflineContext);
}

/**
 * Provider monte dans le RootLayout. Fait deux choses :
 * 1) Drain auto de la file offline des qu'on est en ligne (useSyncOffline)
 * 2) Affiche le banner top + la modale "ventes en attente de sync"
 *
 * Expose l'etat du drain via SyncOfflineContext pour les composants
 * qui veulent afficher la progression (banner-hors-ligne lit "X/N").
 *
 * Le banner est visible sur toutes les pages, pas seulement /pos : si
 * le caissier sort de la page POS apres une vente offline, il garde la
 * visibilite sur la file.
 */
export function SyncOfflineProvider({ children }: { children: ReactNode }) {
  const etatDrain = useSyncOffline();
  const [fileOuverte, setFileOuverte] = useState(false);

  return (
    <SyncOfflineContext.Provider value={etatDrain}>
      <BannerHorsLigne onVoirFile={() => setFileOuverte(true)} />
      {children}
      <ModalFileOffline ouvert={fileOuverte} onFermer={() => setFileOuverte(false)} />
    </SyncOfflineContext.Provider>
  );
}
