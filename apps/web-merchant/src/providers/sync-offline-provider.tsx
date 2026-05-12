"use client";

import { useState, type ReactNode } from "react";
import { useSyncOffline } from "@/features/vente/hooks/useSyncOffline";
import { BannerHorsLigne } from "@/components/layout/banner-hors-ligne";
import { ModalFileOffline } from "@/components/layout/modal-file-offline";

/**
 * Provider monte dans le RootLayout. Fait deux choses :
 * 1) Drain auto de la file offline des qu'on est en ligne (useSyncOffline)
 * 2) Affiche le banner top + la modale "ventes en attente de sync"
 *
 * Le banner est visible sur toutes les pages, pas seulement /pos : si le
 * caissier sort de la page POS apres une vente offline, il garde la visibilite
 * sur la file.
 */
export function SyncOfflineProvider({ children }: { children: ReactNode }) {
  useSyncOffline();
  const [fileOuverte, setFileOuverte] = useState(false);

  return (
    <>
      <BannerHorsLigne onVoirFile={() => setFileOuverte(true)} />
      {children}
      <ModalFileOffline ouvert={fileOuverte} onFermer={() => setFileOuverte(false)} />
    </>
  );
}
