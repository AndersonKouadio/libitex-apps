"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { forcerRafraichissementToken } from "@/lib/http";

/**
 * Limite de refresh consecutifs en cas de connect_error d'auth. Si on
 * depasse, on abandonne le WS pour eviter la boucle infinie
 * connect_error -> refresh -> reconnect -> connect_error...
 * Fix I4 de la revue qualite.
 */
const MAX_REFRESH_AUTH_WS = 3;

/**
 * Mots-cles dans le message connect_error qui indiquent un probleme
 * d'auth. Si le backend change le wording, ajouter ici.
 */
const MOTS_CLES_AUTH = ["token", "auth", "unauthorized", "jwt", "expired", "expire"];

function estErreurAuth(message: string): boolean {
  const lower = message.toLowerCase();
  return MOTS_CLES_AUTH.some((mot) => lower.includes(mot));
}

/**
 * Provider Socket.io : connecte un seul socket par session utilisateur,
 * et invalide les queries TanStack a la reception d'events broadcastes
 * par le backend (stock.updated, ticket.completed, produit.changed,
 * disponibilites.changed, reservation.changed).
 *
 * Le socket est joint a la room `tenant:{tenantId}`, donc les events
 * d'un autre tenant ne le concernent pas.
 *
 * Fallback : meme sans WS (connexion impossible), les queries TanStack
 * gardent leur refetchInterval et refetchOnWindowFocus.
 *
 * Resilience auth : sur connect_error d'auth, on declenche un refresh
 * token via httpClient. Limite a MAX_REFRESH_AUTH_WS tentatives par
 * session pour eviter la boucle infinie.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  /**
   * Compteur de refresh consecutifs declenches par le WS. Reset a 0
   * - au changement de token (nouvelle session apres login/refresh OK)
   * - sur 'connect' reussi (la connexion fonctionne)
   * Permet d'arreter apres MAX_REFRESH_AUTH_WS tentatives infructueuses.
   */
  const refreshAuthCount = useRef(0);

  useEffect(() => {
    if (!token) return;
    // Nouveau token = nouveau quota de refresh.
    refreshAuthCount.current = 0;

    // On retire le suffix /api/v1 pour pointer sur la racine HTTP (Socket.io
    // ecoute sur /socket.io a la racine du serveur).
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
    const wsBase = apiBase.replace(/\/api\/v\d+\/?$/, "");

    const socket = io(wsBase, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Connexion OK : on autorise de futurs refresh si le token venait
      // a expirer plus tard durant cette session.
      refreshAuthCount.current = 0;
    });

    socket.on("connect_error", (err) => {
      const message = err?.message ?? "";
      if (!estErreurAuth(message)) return;

      // Quota epuise : on arrete sans deconnecter le user. Les queries
      // TanStack continuent via polling (refetchInterval). Le WS est un
      // boost de fraicheur, pas critique a l'usage.
      if (refreshAuthCount.current >= MAX_REFRESH_AUTH_WS) {
        socket.disconnect();
        // eslint-disable-next-line no-console
        console.warn(
          "[realtime] Limite de refresh atteinte sur le WS, abandon. "
          + "Les queries TanStack restent fraiches via polling.",
        );
        return;
      }
      refreshAuthCount.current += 1;

      // Stopper les tentatives socket.io avec le token expire pour eviter
      // les reconnexions echouees inutiles. Le refresh propagera un
      // nouveau token via onTokenRefreshed -> useAuth -> re-render -> ce
      // useEffect re-execute avec le nouveau token et recree un socket.
      socket.disconnect();
      forcerRafraichissementToken();
    });

    socket.on("stock.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    });
    socket.on("disponibilites.changed", () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "disponibilites"] });
    });
    socket.on("ticket.completed", () => {
      queryClient.invalidateQueries({ queryKey: ["vente"] });
      queryClient.invalidateQueries({ queryKey: ["session-caisse"] });
      queryClient.invalidateQueries({ queryKey: ["tableau-de-bord"] });
    });
    socket.on("produit.changed", () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
    });
    // Reservations : invalide la liste pour que les autres caissiers
    // voient les changements de statut en temps reel.
    socket.on("reservation.changed", () => {
      queryClient.invalidateQueries({ queryKey: ["reservation"] });
    });

    // Achats : nouvelle commande creee sur un autre poste -> rafraichit
    // la liste pour que tous les acheteurs voient le BC immediatement
    // (fix I8 Module 5).
    socket.on("commande.creee", () => {
      queryClient.invalidateQueries({ queryKey: ["achat", "commandes"] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, queryClient]);

  return <>{children}</>;
}
