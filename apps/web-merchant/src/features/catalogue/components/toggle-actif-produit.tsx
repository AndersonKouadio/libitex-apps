"use client";

import { Switch } from "@heroui/react";
import { useBasculerActifProduitMutation } from "../queries/produit-update.mutation";

interface Props {
  produitId: string;
  produitNom: string;
  actif: boolean;
}

/**
 * Switch inline pour basculer le statut actif/inactif d'un produit
 * directement depuis la liste catalogue. La mutation est immediate
 * (pas de bouton Enregistrer) et le produit disparait du POS en
 * temps reel grace a l'invalidation de la queryKey "catalogue".
 */
export function ToggleActifProduit({ produitId, produitNom, actif }: Props) {
  const mutation = useBasculerActifProduitMutation();

  return (
    <Switch
      isSelected={actif}
      onChange={(val) => mutation.mutate({ id: produitId, actif: val })}
      isDisabled={mutation.isPending}
      aria-label={`${actif ? "Desactiver" : "Activer"} ${produitNom}`}
      className="gap-2"
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Content className="text-xs text-muted">
        {actif ? "Actif" : "Inactif"}
      </Switch.Content>
    </Switch>
  );
}
