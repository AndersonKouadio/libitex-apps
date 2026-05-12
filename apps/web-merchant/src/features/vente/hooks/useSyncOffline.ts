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
 * (guard enCoursRef) ; si une vente echoue, on marque l'erreur sur
 * l'entree mais on continue les suivantes.
 *
 * Securite (fix C2) : on draine UNIQUEMENT les ventes du tenant courant.
 * Si le caissier a switche de boutique, les ventes de l'ancienne
 * boutique restent en attente jusqu'a ce qu'il y retourne.
 *
 * Idempotence (fix C4) : chaque vente envoie son `idempotencyKey` au
 * backend. Si la creation precedente avait abouti mais le drain avait
 * crashe avant le retrait local, le backend renverra le ticket existant
 * au lieu d'un doublon.
 *
 * Monte dans le layout via SyncOfflineProvider pour que le drain tourne
 * meme si l'utilisateur n'est pas sur /pos quand le reseau revient.
 */
export function useSyncOffline() {
  const { token, utilisateur } = useAuth();
  const tenantId = utilisateur?.tenantId ?? null;
  const enLigne = useNetworkStatus();
  const file = useFileOffline();
  const queryClient = useQueryClient();
  const invalidateVente = useInvalidateVenteQuery();
  const enCoursRef = useRef(false);

  useEffect(() => {
    if (!enLigne || !token || !tenantId) return;
    if (enCoursRef.current) return;
    // Filtre fix C2 : seules les ventes du tenant courant. Les ventes
    // d'autres tenants attendent. Filtre erreur : on ne re-essaie pas
    // les conflits permanents (l'utilisateur passe par "Reessayer" pour
    // les debloquer).
    const aDrainer = file.filter((v) => v.tenantId === tenantId && !v.erreur);
    if (aDrainer.length === 0) return;

    enCoursRef.current = true;
    (async () => {
      let succes = 0;
      let erreurs = 0;
      for (const vente of aDrainer) {
        try {
          // creerTicket envoie idempotencyKey -> si deja vu, backend
          // retourne le ticket existant (200), pas un doublon.
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
  }, [enLigne, token, tenantId, file, invalidateVente, queryClient]);
}
