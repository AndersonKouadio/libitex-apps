import type { ReactNode } from "react";

interface Props {
  /** Titre principal de la page (h1). Optionnel si on veut juste un sous-titre. */
  titre?: string;
  /** Description courte sous le titre. */
  description?: ReactNode;
  /** Actions a droite (boutons, filtres...). */
  actions?: ReactNode;
}

/**
 * En-tete standard pour le contenu d'une page : titre + description + actions
 * a droite. Garantit un espacement coherent entre toutes les pages.
 */
export function PageHeader({ titre, description, actions }: Props) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      {(titre || description) && (
        <div className="min-w-0 flex-1">
          {titre && (
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {titre}
            </h2>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-muted mt-0.5 max-w-2xl">
              {description}
            </p>
          )}
        </div>
      )}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
