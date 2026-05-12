import * as Sentry from "@sentry/node";

/**
 * Init Sentry pour le backend. No-op si SENTRY_DSN absent (dev local sans
 * monitoring). A appeler le plus tot possible dans le bootstrap, avant
 * NestFactory.create — sinon les erreurs d'init Nest ne sont pas tracees.
 */
export function initSentryServer(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    release: process.env.APP_VERSION ?? "dev",
    tracesSampleRate: 0.1,
    // Filtre : ignorer les 401 / 404 / 403 — ce sont des erreurs metier
    // attendues, pas des bugs.
    ignoreErrors: [
      /^Unauthorized$/,
      /^Forbidden$/,
      /^Not Found$/,
      "PayloadTooLargeError",
    ],
  });
}

export { Sentry };
