"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { IUtilisateurSession } from "../types/auth.type";
import { authAPI } from "../apis/auth.api";
import type { ConnexionDTO } from "../schemas/auth.schema";

const STORAGE_TOKEN = "libitex_token";
const STORAGE_USER = "libitex_user";

interface AuthContextValue {
  token: string | null;
  utilisateur: IUtilisateurSession | null;
  enChargement: boolean;
  connecter: (data: ConnexionDTO) => Promise<void>;
  deconnecter: () => void;
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
  const [enChargement, setEnChargement] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_TOKEN);
    const savedUser = localStorage.getItem(STORAGE_USER);
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUtilisateur(JSON.parse(savedUser));
    }
    setEnChargement(false);
  }, []);

  const connecter = useCallback(async (data: ConnexionDTO) => {
    const res = await authAPI.connecter(data);
    setToken(res.accessToken);
    setUtilisateur(res.utilisateur);
    localStorage.setItem(STORAGE_TOKEN, res.accessToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(res.utilisateur));
  }, []);

  const deconnecter = useCallback(() => {
    setToken(null);
    setUtilisateur(null);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  }, []);

  return { token, utilisateur, enChargement, connecter, deconnecter };
}
