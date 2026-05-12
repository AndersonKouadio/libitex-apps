"use client";

import {
  QueryClient, QueryClientProvider, QueryCache, MutationCache,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/browser";
import { useState, type ReactNode } from "react";
import { HttpError } from "@/lib/http";

/**
 * Fix C5 Module 8 : capture centralisee des erreurs React Query.
 * Sentry visualise les bugs reels sans avoir a instrumenter chaque hook
 * individuellement. On filtre les 4xx (erreurs metier attendues : 401,
 * 403, 404...) pour ne pas polluer.
 */
function shouldCaptureHttpError(err: unknown): boolean {
  // Filtres : erreurs metier classiques (auth refus, ressource manquante)
  // -> pas un bug. On capture seulement les 5xx + erreurs reseau natives.
  if (err instanceof HttpError) {
    return err.status >= 500;
  }
  // Autres erreurs (TypeError, ReferenceError, NetworkError) : capture.
  return true;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Fix C5 : QueryCache global capture les erreurs de fetch.
        queryCache: new QueryCache({
          onError: (err, query) => {
            if (!shouldCaptureHttpError(err)) return;
            Sentry.captureException(err, {
              tags: { source: "react-query", queryKey: String(query.queryKey[0] ?? "?") },
              extra: { queryKey: query.queryKey },
            });
          },
        }),
        // Fix C5 : MutationCache global capture les erreurs de mutation.
        mutationCache: new MutationCache({
          onError: (err, _vars, _ctx, mutation) => {
            if (!shouldCaptureHttpError(err)) return;
            Sentry.captureException(err, {
              tags: {
                source: "react-query-mutation",
                mutationKey: String(mutation.options.mutationKey?.[0] ?? "?"),
              },
            });
          },
        }),
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
