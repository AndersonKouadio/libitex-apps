"use client";

import * as Sentry from "@sentry/browser";

/**
 * Init Sentry cote client. Idempotent : si Sentry est deja init, ne refait
 * rien. Si la variable d'env NEXT_PUBLIC_SENTRY_DSN n'est pas definie, ne
 * fait rien (no-op) — ainsi le code marche en dev local sans config.
 *
 * Le DSN est inline au build par Next.js (variable NEXT_PUBLIC_*). Le
 * release est calque sur NEXT_PUBLIC_APP_VERSION si fourni, sinon "dev".
 */
let initialise = false;

export function initSentryClient(): void {
  if (initialise) return;
  if (typeof window === "undefined") return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    // Reduire le bruit : 10% des transactions normales suffisent pour
    // detecter les regressions. Erreurs (capture* / unhandled) toujours
    // capturees a 100%.
    tracesSampleRate: 0.1,
    // Replay session : sur erreur uniquement, 0% sinon (preserve la bande
    // passante du caissier).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Filtre : ignorer les erreurs reseau benignes du POS offline.
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      "AbortError",
    ],
  });
  initialise = true;
}

/**
 * Tag les events Sentry avec l'utilisateur connecte (tenantId + role). A
 * appeler depuis AuthProvider quand le user change. Si user=null,
 * deconnecte le contexte.
 */
export function definirUtilisateurSentry(user: {
  id: string;
  tenantId: string;
  role: string;
} | null): void {
  if (!initialise) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: user.id });
  Sentry.setTag("tenantId", user.tenantId);
  Sentry.setTag("role", user.role);
}
