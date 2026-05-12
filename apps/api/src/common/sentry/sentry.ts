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
    // Filtre : erreurs metier attendues (auth refus, ressource manquante,
    // payload trop gros, rate limit, abort client). Fix I3 Module 8 : on
    // ajoute les exceptions metier custom + erreurs reseau benignes.
    ignoreErrors: [
      /^Unauthorized$/,
      /^Forbidden$/,
      /^Not Found$/,
      /^Bad Request$/,
      "PayloadTooLargeException",
      "ThrottlerException",            // rate limit declenche
      "AbortError",                    // client a abandonne la requete
      "ECONNRESET",                    // tcp reset (normal sur deconnexion)
      "EPIPE",                         // broken pipe
      "RessourceIntrouvableException", // exception metier custom
      "StockInsuffisantException",
      "SessionCaisseRequiseException",
      "PaiementInsuffisantException",
      "TicketNonModifiableException",
    ],
  });
}

export { Sentry };
