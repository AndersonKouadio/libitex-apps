"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { AuthContext, useAuthState } from "@/features/auth/hooks/useAuth";
import { onTokenRefreshed, onAuthExpired } from "@/lib/http";
import { initSentryClient, definirUtilisateurSentry } from "@/lib/sentry";

/**
 * Routes accessibles sans authentification — on n'y redirige pas vers
 * /connexion si la session expire (sinon l'utilisateur en train de se
 * loguer serait sorti de la page).
 */
const ROUTES_PUBLIQUES = [
  "/",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
];

function estRoutePublique(pathname: string | null): boolean {
  if (!pathname) return true;
  if (ROUTES_PUBLIQUES.includes(pathname)) return true;
  // /boutique/[slug] = showcase e-commerce public.
  if (pathname.startsWith("/boutique/")) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();
  const { rafraichirTokenLocal, utilisateur, deconnecter } = authState;
  const router = useRouter();
  const pathname = usePathname();

  // Init Sentry une fois au montage. No-op si DSN absent.
  useEffect(() => {
    initSentryClient();
  }, []);

  // Sync user context Sentry seulement quand l'identite change reellement.
  // L'ancienne dep `[utilisateur]` re-fire a chaque re-render qui change la
  // reference de l'objet, meme sans changement d'identite. Fix M4.
  useEffect(() => {
    definirUtilisateurSentry(utilisateur ? {
      id: utilisateur.id,
      tenantId: utilisateur.tenantId,
      role: utilisateur.role,
    } : null);
  }, [utilisateur?.id, utilisateur?.tenantId, utilisateur?.role]);

  // Quand le httpClient refresh transparent (succes), il notifie via
  // onTokenRefreshed pour synchroniser le state React (sinon
  // useAuth().token resterait sur l'ancien).
  useEffect(() => {
    return onTokenRefreshed((accessToken, refreshToken) => {
      rafraichirTokenLocal(accessToken, refreshToken);
    });
  }, [rafraichirTokenLocal]);

  // Refresh definitivement KO (refresh token expire / revoque / compte
  // desactive / membership retiree) : deconnexion locale + redirection.
  // Sans ce mecanisme, l'utilisateur restait sur un ecran casse avec
  // des 401 en cascade. Fix C4.
  useEffect(() => {
    return onAuthExpired(() => {
      deconnecter();
      if (!estRoutePublique(pathname)) {
        toast.warning("Session expiree — reconnectez-vous");
        router.replace("/connexion");
      }
    });
  }, [deconnecter, router, pathname]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
