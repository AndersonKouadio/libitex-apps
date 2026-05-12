"use client";

import * as Sentry from "@sentry/browser";

/**
 * Fix I10 Module 8 : rate limit Sentry pour eviter le DOS dashboard en
 * cas de boucle d'erreur (ex. useEffect qui throw chaque render).
 * Memoire onglet (perdu au reload — c'est voulu).
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 10;
const signatureCounter = new Map<string, { count: number; resetAt: number }>();

function signatureFromEvent(event: {
  message?: string;
  exception?: { values?: Array<{ type?: string; value?: string }> };
}): string {
  const ex = event.exception?.values?.[0];
  return `${ex?.type ?? ""}:${ex?.value ?? event.message ?? "unknown"}`;
}

function devraitDropper(signature: string): boolean {
  const now = Date.now();
  const slot = signatureCounter.get(signature);
  if (!slot || now >= slot.resetAt) {
    signatureCounter.set(signature, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  slot.count += 1;
  return slot.count > RATE_LIMIT_MAX_EVENTS;
}

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
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Filtre : erreurs reseau benignes (panne intermittente, navigation
    // brusque, AbortController) + erreurs Next.js attendues.
    // Fix I3 Module 8 : enrichi avec ChunkLoadError (deploy en cours) et
    // erreurs HTTP 4xx classiques.
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      "ChunkLoadError",         // deploy en cours, ancien bundle 404
      /Loading chunk \d+ failed/,
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
    /**
     * Fix I4 Module 8 : ne pas envoyer les breadcrumbs de requetes vers
     * les domaines tiers (CDN, GA, etc.). On ne garde que les fetches
     * vers notre API + storage. Permet un debug efficace sans pollution.
     */
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        const url = (breadcrumb.data?.url as string | undefined) ?? "";
        if (!url) return breadcrumb;
        const garderDomains = [
          "libitex-api.lunion-lab.com",
          "libitex-storage.lunion-lab.com",
          "localhost",
        ];
        if (!garderDomains.some((d) => url.includes(d))) return null;
      }
      return breadcrumb;
    },
    /**
     * Fix I10 Module 8 : rate limit en memoire avant envoi. Protege
     * Sentry d'un crashloop UI (10 events/min/signature max).
     */
    beforeSend(event) {
      const sig = signatureFromEvent(event);
      if (devraitDropper(sig)) return null;
      return event;
    },
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
