"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/browser";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** UI personnalisee a afficher en cas de crash. Defaut : ecran de
   *  recuperation simple avec bouton "Recharger". */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global qui capture les erreurs React (render, lifecycle)
 * et empeche la page entiere de se demonter sur une exception.
 *
 * Fix C1 Module 8 : sans ErrorBoundary, un `.map()` sur undefined dans un
 * composant fait crasher tout l'arbre React -> ecran blanc. Le caissier
 * doit recharger F5 manuellement. Ici on attrape, on remonte a Sentry et
 * on affiche un fallback avec bouton "Recharger".
 *
 * NB : `componentDidCatch` ne capture PAS les erreurs async (promise
 * rejection). Pour celles-la on a `window.unhandledrejection` (gere
 * separement dans Sentry init).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }): void {
    // Remonte sur Sentry avec le component stack React pour faciliter le debug.
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: { source: "react-error-boundary" },
    });
  }

  handleRecharger = (): void => {
    // Reload complet pour partir d'un etat clean. Le panier offline est
    // persiste en localStorage, pas de perte.
    if (typeof window !== "undefined") window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertCircle size={28} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Une erreur est survenue</h1>
              <p className="text-sm text-muted mt-1">
                L&apos;application a rencontre un probleme inattendu. Vos donnees offline
                sont en securite dans le navigateur.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-xs text-muted bg-surface-secondary p-3 rounded text-left overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleRecharger}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-accent-foreground hover:brightness-95"
            >
              <RotateCcw size={14} /> Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
