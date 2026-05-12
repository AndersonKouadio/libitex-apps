"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Provider Socket.io : connecte un seul socket par session utilisateur,
 * et invalide les queries TanStack a la reception d'events broadcastes
 * par le backend (stock.updated, ticket.completed, produit.changed,
 * disponibilites.changed).
 *
 * Le socket est joint a la room `tenant:{tenantId}`, donc les events
 * d'un autre tenant ne le concernent pas.
 *
 * Fallback : meme sans WS (connexion impossible), les queries TanStack
 * gardent leur refetchInterval et refetchOnWindowFocus.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log("[Realtime] effect fired, token=", token ? "present" : "null");
    if (!token) return;

    // On retire le suffix /api/v1 pour pointer sur la racine HTTP (Socket.io
    // ecoute sur /socket.io a la racine du serveur).
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
    const wsBase = apiBase.replace(/\/api\/v\d+\/?$/, "");
    console.log("[Realtime] connecting to", wsBase);

    const socket = io(wsBase, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;
    socket.on("connect", () => console.log("[Realtime] connected", socket.id));
    socket.on("connect_error", (e) => console.warn("[Realtime] connect_error", e.message));
    socket.on("disconnect", (r) => console.log("[Realtime] disconnected", r));

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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, queryClient]);

  return <>{children}</>;
}
