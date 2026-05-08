"use client";

import { Button } from "@heroui/react";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

interface Props extends Omit<ButtonProps, "size"> {
  /**
   * Taille — par defaut "md" : h-14 (56px) conforme DS §8.1 (touch target POS).
   * "sm" : h-11 (44px, mini WCAG) pour les actions secondaires sur mobile/tablette.
   */
  taille?: "md" | "sm";
}

const TAILLES = {
  md: "h-14 text-base font-semibold gap-2",
  sm: "h-11 text-sm font-semibold gap-2",
} as const;

/**
 * Wrapper Button HeroUI v3 standardise pour les boutons POS.
 * Applique : hauteur conforme touch target (56px ou 44px), typo en gras,
 * gap 2 entre icone et label. La variante (primary/secondary/outline/ghost/danger)
 * et le className additionnel restent libres.
 */
export function BoutonPOS({ taille = "md", className = "", children, ...props }: Props) {
  return (
    <Button {...props} className={`${TAILLES[taille]} ${className}`}>
      {children}
    </Button>
  );
}
