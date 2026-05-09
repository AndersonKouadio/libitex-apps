"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@heroui/react";
import { sessionCaisseAPI } from "../apis/session-caisse.api";
import {
  ouvrirSessionSchema, fermerSessionSchema,
} from "../schemas/session-caisse.schema";
import { useInvalidateSessionCaisseQuery } from "../queries/index.query";
import type { FondParMethode } from "../types/session-caisse.type";

/**
 * Hook qui regroupe les actions sur la session caisse :
 * ouvrir, fermer, reporter ticket. Comme useEncaissement, possede un
 * verrou via ref pour empecher les double-clics.
 */
export function useSessionCaisse(token: string | null) {
  const [enCours, setEnCours] = useState(false);
  const verrou = useRef(false);
  const invalider = useInvalidateSessionCaisseQuery();

  const ouvrir = useCallback(async (input: {
    emplacementId: string;
    fondInitial: Partial<FondParMethode>;
    commentaire?: string;
  }) => {
    if (!token) return null;
    if (verrou.current) return null;

    const payload = ouvrirSessionSchema.safeParse(input);
    if (!payload.success) {
      toast.danger(payload.error.issues[0]?.message ?? "Donnees invalides");
      return null;
    }

    verrou.current = true;
    setEnCours(true);
    try {
      const session = await sessionCaisseAPI.ouvrir(token, payload.data);
      invalider();
      toast.success(`Caisse ${session.numeroSession} ouverte`);
      return session;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur a l'ouverture de la caisse");
      return null;
    } finally {
      setEnCours(false);
      verrou.current = false;
    }
  }, [token, invalider]);

  const fermer = useCallback(async (sessionId: string, input: {
    fondFinalDeclare: Partial<FondParMethode>;
    commentaire?: string;
  }) => {
    if (!token) return null;
    if (verrou.current) return null;

    const payload = fermerSessionSchema.safeParse(input);
    if (!payload.success) {
      toast.danger(payload.error.issues[0]?.message ?? "Donnees invalides");
      return null;
    }

    verrou.current = true;
    setEnCours(true);
    try {
      const session = await sessionCaisseAPI.fermer(token, sessionId, payload.data);
      invalider();
      toast.success(`Caisse ${session.numeroSession} fermee`);
      return session;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur a la fermeture de la caisse");
      return null;
    } finally {
      setEnCours(false);
      verrou.current = false;
    }
  }, [token, invalider]);

  const reporterTicket = useCallback(async (ticketId: string) => {
    if (!token) return false;
    if (verrou.current) return false;
    verrou.current = true;
    setEnCours(true);
    try {
      await sessionCaisseAPI.reporterTicket(token, ticketId);
      invalider();
      toast.success("Ticket reporte a la prochaine session");
      return true;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors du report");
      return false;
    } finally {
      setEnCours(false);
      verrou.current = false;
    }
  }, [token, invalider]);

  return { enCours, ouvrir, fermer, reporterTicket };
}
