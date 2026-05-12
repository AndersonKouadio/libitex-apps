"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { IUtilisateurSession, IBoutiqueResume } from "../types/auth.type";
import { authAPI } from "../apis/auth.api";
import type { ConnexionDTO } from "../schemas/auth.schema";
import { STORAGE_KEYS } from "@/lib/storage-keys";

/**
 * Donnees necessaires pour persister une session complete en localStorage
 * + state React. Signature objet pour clarte aux call-sites (au lieu de
 * 5 args positionnels).
 */
export interface AppliquerSessionParams {
  accessToken: string;
  refreshToken: string;
  utilisateur: IUtilisateurSession;
  boutiques: IBoutiqueResume[];
  boutiqueActive: IBoutiqueResume;
}

interface AuthContextValue {
  token: string | null;
  utilisateur: IUtilisateurSession | null;
  boutiques: IBoutiqueResume[];
  boutiqueActive: IBoutiqueResume | null;
  enChargement: boolean;
  connecter: (data: ConnexionDTO) => Promise<void>;
  deconnecter: () => void;
  /**
   * Persiste une nouvelle session complete (au login, switch boutique,
   * MAJ utilisateur...). Signature objet pour eviter les call-sites
   * positionnels illisibles. Fix I6 de la revue.
   */
  appliquerSession: (params: AppliquerSessionParams) => void;
  /**
   * Met a jour le token sans toucher au reste du state. Appele par le
   * httpClient quand un refresh transparent est effectue (voir
   * onTokenRefreshed dans lib/http).
   */
  rafraichirTokenLocal: (accessToken: string, refreshToken: string) => void;
  mettreAJourUtilisateur: (patch: Partial<IUtilisateurSession>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise dans un AuthProvider");
  return ctx;
}

/**
 * Cles localStorage observees pour la sync entre onglets. Si une de ces
 * cles change (logout sur autre onglet, refresh effectue sur autre
 * onglet), on resynchronise le state React de l'onglet courant.
 */
const KEYS_SYNCED = new Set<string>([
  STORAGE_KEYS.AUTH_TOKEN,
  STORAGE_KEYS.AUTH_REFRESH,
  STORAGE_KEYS.AUTH_USER,
  STORAGE_KEYS.AUTH_BOUTIQUES,
  STORAGE_KEYS.AUTH_BOUTIQUE_ACTIVE,
]);

export function useAuthState() {
  const [token, setToken] = useState<string | null>(null);
  const [utilisateur, setUtilisateur] = useState<IUtilisateurSession | null>(null);
  const [boutiques, setBoutiques] = useState<IBoutiqueResume[]>([]);
  const [boutiqueActive, setBoutiqueActive] = useState<IBoutiqueResume | null>(null);
  const [enChargement, setEnChargement] = useState(true);

  /**
   * Lit le localStorage et applique au state React. Utilise au mount initial
   * + au reveil par event 'storage' (sync entre onglets).
   */
  const chargerDepuisStorage = useCallback(() => {
    const savedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const savedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    const savedBoutiques = localStorage.getItem(STORAGE_KEYS.AUTH_BOUTIQUES);
    const savedActive = localStorage.getItem(STORAGE_KEYS.AUTH_BOUTIQUE_ACTIVE);

    if (savedToken && savedUser) {
      setToken(savedToken);
      try { setUtilisateur(JSON.parse(savedUser)); } catch { setUtilisateur(null); }
      try { setBoutiques(savedBoutiques ? JSON.parse(savedBoutiques) : []); } catch { setBoutiques([]); }
      try { setBoutiqueActive(savedActive ? JSON.parse(savedActive) : null); } catch { setBoutiqueActive(null); }
    } else {
      // Logout depuis un autre onglet ou session expiree : on nettoie.
      setToken(null);
      setUtilisateur(null);
      setBoutiques([]);
      setBoutiqueActive(null);
    }
  }, []);

  useEffect(() => {
    chargerDepuisStorage();
    setEnChargement(false);
  }, [chargerDepuisStorage]);

  /**
   * Sync entre onglets : l'event 'storage' se declenche dans tous les
   * onglets SAUF celui qui a modifie localStorage. Si un autre onglet
   * a logout (a vide les cles) ou a refresh le token, on resynchronise.
   * Fix C5 de la revue.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleStorage(e: StorageEvent) {
      // null key = clear() global -> on resync tout.
      if (e.key === null || KEYS_SYNCED.has(e.key)) {
        chargerDepuisStorage();
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [chargerDepuisStorage]);

  const persister = useCallback((params: AppliquerSessionParams) => {
    setToken(params.accessToken);
    setUtilisateur(params.utilisateur);
    setBoutiques(params.boutiques);
    setBoutiqueActive(params.boutiqueActive);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, params.accessToken);
    localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH, params.refreshToken);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(params.utilisateur));
    localStorage.setItem(STORAGE_KEYS.AUTH_BOUTIQUES, JSON.stringify(params.boutiques));
    localStorage.setItem(STORAGE_KEYS.AUTH_BOUTIQUE_ACTIVE, JSON.stringify(params.boutiqueActive));
  }, []);

  const connecter = useCallback(async (data: ConnexionDTO) => {
    const res = await authAPI.connecter(data);
    persister({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      utilisateur: res.utilisateur,
      boutiques: res.boutiques,
      boutiqueActive: res.boutiqueActive,
    });
  }, [persister]);

  const deconnecter = useCallback(() => {
    setToken(null);
    setUtilisateur(null);
    setBoutiques([]);
    setBoutiqueActive(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_REFRESH);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_BOUTIQUES);
    localStorage.removeItem(STORAGE_KEYS.AUTH_BOUTIQUE_ACTIVE);
    // Securite (fix C1 Module 2) : on purge aussi la file de ventes
    // offline ET son compteur. Sans ca, un user qui se connecte sur le
    // meme device verrait/synchroniserait les ventes du precedent user
    // -> leak de donnees entre comptes + ventes envoyees sur la mauvaise
    // boutique.
    localStorage.removeItem(STORAGE_KEYS.POS_OFFLINE_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.POS_OFFLINE_COUNTER);
  }, []);

  const rafraichirTokenLocal = useCallback((accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    // Le httpClient a deja ecrit dans localStorage avant de notifier, mais
    // on re-ecrit ici pour rester defensifs si l'ordre change.
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.AUTH_REFRESH, refreshToken);
  }, []);

  const mettreAJourUtilisateur = useCallback((patch: Partial<IUtilisateurSession>) => {
    setUtilisateur((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    token, utilisateur, boutiques, boutiqueActive, enChargement,
    connecter, deconnecter, appliquerSession: persister, rafraichirTokenLocal, mettreAJourUtilisateur,
  };
}
