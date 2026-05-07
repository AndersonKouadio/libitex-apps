"use client";

import { useCallback, useState } from "react";
import { authAPI } from "../apis/auth.api";
import type { InscriptionDTO } from "../schemas/auth.schema";
import type { IUtilisateurSession } from "../types/auth.type";

const STORAGE_TOKEN = "libitex_token";
const STORAGE_USER = "libitex_user";

interface EtatInscription {
  enCours: boolean;
  erreur: string;
  inscrire: (data: InscriptionDTO) => Promise<boolean>;
}

export function useInscription(): EtatInscription {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const inscrire = useCallback(async (data: InscriptionDTO): Promise<boolean> => {
    setErreur("");
    setEnCours(true);
    try {
      const res = await authAPI.inscrire(data);
      localStorage.setItem(STORAGE_TOKEN, res.accessToken);
      localStorage.setItem(STORAGE_USER, JSON.stringify(res.utilisateur));
      return true;
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'inscription");
      return false;
    } finally {
      setEnCours(false);
    }
  }, []);

  return { enCours, erreur, inscrire };
}
