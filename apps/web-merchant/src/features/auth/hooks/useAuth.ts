"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { IUtilisateurSession, IBoutiqueResume } from "../types/auth.type";
import { authAPI } from "../apis/auth.api";
import type { ConnexionDTO } from "../schemas/auth.schema";

const STORAGE_TOKEN = "libitex_token";
const STORAGE_USER = "libitex_user";
const STORAGE_BOUTIQUES = "libitex_boutiques";
const STORAGE_BOUTIQUE_ACTIVE = "libitex_boutique_active";

interface AuthContextValue {
  token: string | null;
  utilisateur: IUtilisateurSession | null;
  boutiques: IBoutiqueResume[];
  boutiqueActive: IBoutiqueResume | null;
  enChargement: boolean;
  connecter: (data: ConnexionDTO) => Promise<void>;
  deconnecter: () => void;
  appliquerSession: (token: string, utilisateur: IUtilisateurSession, boutiques: IBoutiqueResume[], active: IBoutiqueResume) => void;
  mettreAJourUtilisateur: (patch: Partial<IUtilisateurSession>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise dans un AuthProvider");
  return ctx;
}

export function useAuthState() {
  const [token, setToken] = useState<string | null>(null);
  const [utilisateur, setUtilisateur] = useState<IUtilisateurSession | null>(null);
  const [boutiques, setBoutiques] = useState<IBoutiqueResume[]>([]);
  const [boutiqueActive, setBoutiqueActive] = useState<IBoutiqueResume | null>(null);
  const [enChargement, setEnChargement] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_TOKEN);
    const savedUser = localStorage.getItem(STORAGE_USER);
    const savedBoutiques = localStorage.getItem(STORAGE_BOUTIQUES);
    const savedActive = localStorage.getItem(STORAGE_BOUTIQUE_ACTIVE);
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUtilisateur(JSON.parse(savedUser));
      if (savedBoutiques) setBoutiques(JSON.parse(savedBoutiques));
      if (savedActive) setBoutiqueActive(JSON.parse(savedActive));
    }
    setEnChargement(false);
  }, []);

  const persister = useCallback((
    t: string,
    u: IUtilisateurSession,
    b: IBoutiqueResume[],
    a: IBoutiqueResume,
  ) => {
    setToken(t);
    setUtilisateur(u);
    setBoutiques(b);
    setBoutiqueActive(a);
    localStorage.setItem(STORAGE_TOKEN, t);
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    localStorage.setItem(STORAGE_BOUTIQUES, JSON.stringify(b));
    localStorage.setItem(STORAGE_BOUTIQUE_ACTIVE, JSON.stringify(a));
  }, []);

  const connecter = useCallback(async (data: ConnexionDTO) => {
    const res = await authAPI.connecter(data);
    persister(res.accessToken, res.utilisateur, res.boutiques, res.boutiqueActive);
  }, [persister]);

  const deconnecter = useCallback(() => {
    setToken(null);
    setUtilisateur(null);
    setBoutiques([]);
    setBoutiqueActive(null);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_BOUTIQUES);
    localStorage.removeItem(STORAGE_BOUTIQUE_ACTIVE);
  }, []);

  const mettreAJourUtilisateur = useCallback((patch: Partial<IUtilisateurSession>) => {
    setUtilisateur((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_USER, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    token, utilisateur, boutiques, boutiqueActive, enChargement,
    connecter, deconnecter, appliquerSession: persister, mettreAJourUtilisateur,
  };
}
