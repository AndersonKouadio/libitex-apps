"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/browser";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Last-resort error handler Next.js. Catche les erreurs qui ne sont pas
 * captees par error.tsx (ex. RootLayout crash, providers crash avant
 * l'ErrorBoundary React).
 *
 * Doit definir son propre <html> + <body> car remplace le RootLayout.
 *
 * Fix C2 Module 8.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { source: "next-global-error", digest: error.digest ?? "" },
    });
  }, [error]);

  return (
    <html lang="fr">
      <body style={{
        margin: 0,
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#fff",
        color: "#0f172a",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}>
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Erreur critique
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
            L&apos;application a rencontre un probleme grave et doit redemarrer.
          </p>
          {error.digest && (
            <p style={{
              fontSize: "0.625rem",
              color: "#94a3b8",
              fontFamily: "ui-monospace, monospace",
              marginBottom: "1rem",
            }}>
              Reference : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              borderRadius: "0.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
