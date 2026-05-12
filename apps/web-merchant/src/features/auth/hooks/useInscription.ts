"use client";

import { useCallback, useState } from "react";
import { authAPI } from "../apis/auth.api";
import { useAuth } from "./useAuth";
import type { InscriptionDTO } from "../schemas/auth.schema";

interface EtatInscription {
  enCours: boolean;
  erreur: string;
  inscrire: (data: InscriptionDTO) => Promise<boolean>;
}

export function useInscription(): EtatInscription {
  const { appliquerSession } = useAuth();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const inscrire = useCallback(async (data: InscriptionDTO): Promise<boolean> => {
    setErreur("");
    setEnCours(true);
    try {
      const res = await authAPI.inscrire(data);
      appliquerSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        utilisateur: res.utilisateur,
        boutiques: res.boutiques,
        boutiqueActive: res.boutiqueActive,
      });
      return true;
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'inscription");
      return false;
    } finally {
      setEnCours(false);
    }
  }, [appliquerSession]);

  return { enCours, erreur, inscrire };
}
