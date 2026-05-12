import * as Sentry from "@sentry/node";

/**
 * Fix I10 Module 8 : rate limit Sentry pour eviter le DOS du dashboard
 * en cas de crashloop. Sur 1000 events/sec du meme type, Sentry facture
 * et le bruit cache les vraies erreurs.
 *
 * Strategie : memoire process, compteur par "signature" (message + stack
 * top frame). Au-dela de 10 events/min meme signature, on drop.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 10;
const signatureCounter = new Map<string, { count: number; resetAt: number }>();

function signatureEvent(event: { message?: string; exception?: { values?: Array<{ type?: string; value?: string }> } }): string {
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
    /**
     * Fix I10 Module 8 : rate limit en memoire avant l'envoi. Protege
     * Sentry d'un crashloop (10 events/min/signature max).
     */
    beforeSend(event) {
      const sig = signatureEvent(event);
      if (devraitDropper(sig)) return null;
      return event;
    },
  });
}

export { Sentry };
