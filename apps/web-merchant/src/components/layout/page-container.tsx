import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Largeur maximale de la zone de contenu. Par defaut max-w-7xl. */
  taille?: "etroit" | "moyen" | "large" | "full";
  className?: string;
}

const TAILLES: Record<NonNullable<Props["taille"]>, string> = {
  etroit: "max-w-2xl",
  moyen: "max-w-4xl",
  large: "max-w-7xl",
  full: "max-w-none",
};

/**
 * Wrapper de page standardise : padding + max-width coherents partout.
 * A utiliser systematiquement comme racine du contenu d'une page.
 */
export function PageContainer({ children, taille = "large", className = "" }: Props) {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 mx-auto w-full ${TAILLES[taille]} ${className}`}>
      {children}
    </div>
  );
}
