"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkStatus } from "@/lib/network-status";
import { fileOffline, useFileOffline } from "../utils/file-attente-offline";
import { venteAPI } from "../apis/vente.api";
import { useInvalidateVenteQuery } from "../queries/index.query";

/**
 * Drain la file offline des qu'on est en ligne. Une seule passe a la fois
 * (guard enCoursRef) ; si une vente echoue (ex. stock epuise entre temps),
 * on marque l'erreur sur l'entree mais on continue les suivantes.
 *
 * Monte dans le layout via SyncOfflineProvider pour que le drain tourne
 * meme si l'utilisateur n'est pas sur /pos quand le reseau revient.
 */
export function useSyncOffline() {
  const { token } = useAuth();
  const enLigne = useNetworkStatus();
  const file = useFileOffline();
  const queryClient = useQueryClient();
  const invalidateVente = useInvalidateVenteQuery();
  const enCoursRef = useRef(false);

  useEffect(() => {
    if (!enLigne || !token) return;
    if (enCoursRef.current) return;
    // Ne re-essayer que les entrees sans erreur (pour ne pas spammer le
    // serveur sur des conflits permanents). L'utilisateur retire manuellement
    // les entrees en conflit via la modale.
    const aDrainer = file.filter((v) => !v.erreur);
    if (aDrainer.length === 0) return;

    enCoursRef.current = true;
    (async () => {
      let succes = 0;
      let erreurs = 0;
      for (const vente of aDrainer) {
        try {
          const t = await venteAPI.creerTicket(token, vente.payloadCreer);
          await venteAPI.completerTicket(token, t.id, { paiements: vente.paiements });
          fileOffline.retirer(vente.id);
          succes += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur inconnue";
          fileOffline.marquerErreur(vente.id, message);
          erreurs += 1;
        }
      }
      enCoursRef.current = false;
      if (succes > 0) {
        toast.success(
          `${succes} vente${succes > 1 ? "s" : ""} hors-ligne synchronisee${succes > 1 ? "s" : ""}`,
        );
        invalidateVente();
        queryClient.invalidateQueries({ queryKey: ["stock"] });
        queryClient.invalidateQueries({ queryKey: ["catalogue", "disponibilites"] });
      }
      if (erreurs > 0) {
        toast.danger(
          `${erreurs} vente${erreurs > 1 ? "s" : ""} en conflit — ouvrir la file pour resoudre`,
        );
      }
    })();
  }, [enLigne, token, file, invalidateVente, queryClient]);
}
