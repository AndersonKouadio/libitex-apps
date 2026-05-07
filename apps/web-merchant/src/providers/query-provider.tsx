"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Donnees considerees stale immediatement: chaque mount refetch.
            staleTime: 0,
            // Garder en cache 5 min pour eviter le flash de loading
            // entre navigations rapides.
            gcTime: 5 * 60 * 1000,
            retry: 1,
            // Recharger au retour sur l'onglet, et a la reconnexion reseau.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
          },
          mutations: {
            // Une mutation echouee ne se rejoue pas automatiquement.
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
