"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkStatus } from "@/lib/network-status";
import { HttpError } from "@/lib/http";
import { fileOffline, useFileOffline } from "../utils/file-attente-offline";
import { venteAPI } from "../apis/vente.api";
import { useInvalidateVenteQuery } from "../queries/index.query";

/**
 * Etat du drain expose aux consumers (banner pour afficher "2/5",
 * future barre de progression, etc.).
 */
export interface EtatDrain {
  enCours: boolean;
  traites: number;
  total: number;
}

const ETAT_INITIAL: EtatDrain = { enCours: false, traites: 0, total: 0 };

/**
 * Determine si une erreur est retry-safe (transitoire) ou metier
 * (definitive). Fix I2.
 * - 5xx : erreur serveur souvent transitoire (overload, deploy) -> retry
 *   auto au prochain drain
 * - 408 (timeout), 429 (rate limit) : aussi transitoire
 * - Autres 4xx (400, 401, 403, 409 conflit stock...) : metier, l'user
 *   doit intervenir manuellement
 * - Error generique (network, parse...) : on suppose transitoire
 */
function estTransitoire(err: unknown): boolean {
  if (err instanceof HttpError) {
    if (err.isServerError()) return true;
    if (err.status === 408 || err.status === 429) return true;
    return false;
  }
  // Erreur reseau ou inconnue : transitoire.
  return true;
}

/**
 * Drain la file offline des qu'on est en ligne. Une seule passe a la
 * fois (guard enCoursRef).
 *
 * Securite (fix C2) : on draine UNIQUEMENT les ventes du tenant courant.
 *
 * Idempotence (fix C4) : chaque vente envoie son `idempotencyKey` au
 * backend.
 *
 * Politique de retry (fix I2) : une erreur transitoire (5xx, network)
 * NE marque PAS l'entry en erreur — au prochain trigger (changement de
 * file, reconnexion), on retentera. Une erreur metier (4xx) marque
 * l'entry en erreur : l'user doit cliquer "Reessayer" manuellement.
 *
 * Progression (fix I4) : etatDrain expose au context provider
 * `{ enCours, traites, total }`.
 */
export function useSyncOffline(): EtatDrain {
  const { token, utilisateur } = useAuth();
  const tenantId = utilisateur?.tenantId ?? null;
  const enLigne = useNetworkStatus();
  const file = useFileOffline();
  const queryClient = useQueryClient();
  const invalidateVente = useInvalidateVenteQuery();
  const enCoursRef = useRef(false);
  const [etatDrain, setEtatDrain] = useState<EtatDrain>(ETAT_INITIAL);

  useEffect(() => {
    if (!enLigne || !token || !tenantId) return;
    if (enCoursRef.current) return;
    const aDrainer = file.filter((v) => v.tenantId === tenantId && !v.erreur);
    if (aDrainer.length === 0) return;

    enCoursRef.current = true;
    setEtatDrain({ enCours: true, traites: 0, total: aDrainer.length });

    (async () => {
      let succes = 0;
      let erreursMetier = 0;
      let erreursTransitoires = 0;
      for (let i = 0; i < aDrainer.length; i += 1) {
        const vente = aDrainer[i]!;
        try {
          // creerTicket envoie idempotencyKey -> backend retourne le
          // ticket existant si deja vu, pas un doublon.
          const t = await venteAPI.creerTicket(token, vente.payloadCreer);
          await venteAPI.completerTicket(token, t.id, { paiements: vente.paiements });
          fileOffline.retirer(vente.id);
          succes += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur inconnue";
          if (estTransitoire(err)) {
            // Retry-safe : on NE marque PAS l'erreur, juste un increment
            // du compteur tentatives pour visibilite. Le prochain trigger
            // retentera automatiquement.
            erreursTransitoires += 1;
            // Stop le drain : si le serveur 5xx, les autres aussi vont
            // probablement 5xx -> on n'inonde pas.
            break;
          }
          // Metier 4xx : on marque definitivement, l'user doit intervenir.
          fileOffline.marquerErreur(vente.id, message);
          erreursMetier += 1;
        }
        setEtatDrain({ enCours: true, traites: i + 1, total: aDrainer.length });
      }
      enCoursRef.current = false;
      setEtatDrain(ETAT_INITIAL);

      if (succes > 0) {
        toast.success(
          `${succes} vente${succes > 1 ? "s" : ""} hors-ligne synchronisee${succes > 1 ? "s" : ""}`,
        );
        invalidateVente();
        queryClient.invalidateQueries({ queryKey: ["stock"] });
        queryClient.invalidateQueries({ queryKey: ["catalogue", "disponibilites"] });
      }
      if (erreursMetier > 0) {
        toast.danger(
          `${erreursMetier} vente${erreursMetier > 1 ? "s" : ""} en conflit — ouvrir la file pour resoudre`,
        );
      }
      if (erreursTransitoires > 0 && succes === 0) {
        // Pas de spam : on n'avertit que si AUCUN succes (drain bloque).
        toast.warning(
          "Serveur temporairement indisponible — sync re-tentee automatiquement",
        );
      }
    })();
  }, [enLigne, token, tenantId, file, invalidateVente, queryClient]);

  return etatDrain;
}
