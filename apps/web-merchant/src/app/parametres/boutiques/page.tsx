"use client";

import { useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { Plus, Store } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBoutiqueListQuery } from "@/features/boutique/queries/boutique-list.query";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useSupprimerBoutiqueMutation } from "@/features/boutique/queries/boutique.mutations";
import { CarteBoutique } from "@/features/boutique/components/carte-boutique";
import { ModalCreerBoutique } from "@/features/boutique/components/modal-creer-boutique";
import { ModalModifierBoutique } from "@/features/boutique/components/modal-modifier-boutique";
import type { IBoutiqueResume } from "@/features/boutique/types/boutique.type";

export default function PageBoutiques() {
  const { boutiques: boutiquesSession } = useAuth();
  const { data: boutiquesAPI, isLoading } = useBoutiqueListQuery();
  // Detail charge pour pre-remplir email/telephone/adresse a l'edition.
  const { data: boutiqueActive } = useBoutiqueActiveQuery();
  const supprimer = useSupprimerBoutiqueMutation();

  const [modalCreationOuvert, setModalCreationOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<IBoutiqueResume | null>(null);

  const boutiques = boutiquesAPI ?? boutiquesSession;

  async function handleSupprimer(b: IBoutiqueResume) {
    const message = `Supprimer définitivement la boutique « ${b.nom} » ?\n\nLes données (catalogue, ventes, stock) ne seront plus accessibles.`;
    if (!window.confirm(message)) return;
    await supprimer.mutateAsync(b.id);
  }

  // Le detail complet (email/telephone/adresse) n'est dispo que pour la boutique
  // active via le JWT. Pour modifier une autre boutique il faut d'abord switcher.
  const boutiquePourEdition = enEdition
    ? boutiqueActive?.id === enEdition.id
      ? { ...enEdition, ...boutiqueActive }
      : enEdition
    : null;

  return (
    <>
      <Topbar titre="Mes boutiques" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <p className="text-sm text-muted max-w-xl">
              Vous pouvez gérer plusieurs boutiques avec un même compte. Chaque boutique a son
              propre catalogue, son stock et ses ventes.
            </p>
            <p className="text-xs text-muted mt-1">
              Pour modifier une boutique, basculez dessus puis cliquez sur le crayon. La suppression est réservée au propriétaire.
            </p>
          </div>
          <Button variant="primary" className="gap-1.5 shrink-0" onPress={() => setModalCreationOuvert(true)}>
            <Plus size={16} />
            Nouvelle boutique
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-xl" />
            ))}
          </div>
        ) : boutiques.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <Store size={32} className="text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucune boutique</p>
            <p className="text-sm text-muted mt-1 mb-4">
              Créez votre première boutique pour commencer
            </p>
            <Button variant="primary" className="gap-1.5" onPress={() => setModalCreationOuvert(true)}>
              <Plus size={16} />
              Créer une boutique
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boutiques.map((b) => (
              <CarteBoutique
                key={b.id}
                boutique={b}
                onModifier={setEnEdition}
                onSupprimer={handleSupprimer}
              />
            ))}
          </div>
        )}
      </div>

      <ModalCreerBoutique
        ouvert={modalCreationOuvert}
        onFermer={() => setModalCreationOuvert(false)}
      />
      <ModalModifierBoutique
        ouvert={!!enEdition}
        boutique={boutiquePourEdition}
        onFermer={() => setEnEdition(null)}
      />
    </>
  );
}
