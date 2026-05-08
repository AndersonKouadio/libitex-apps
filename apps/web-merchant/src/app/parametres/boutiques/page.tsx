"use client";

import { useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { Plus, Store } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBoutiqueListQuery } from "@/features/boutique/queries/boutique-list.query";
import { useSupprimerBoutiqueMutation } from "@/features/boutique/queries/boutique.mutations";
import { CarteBoutique } from "@/features/boutique/components/carte-boutique";
import { ModalCreerBoutique } from "@/features/boutique/components/modal-creer-boutique";
import { ModalModifierBoutique } from "@/features/boutique/components/modal-modifier-boutique";
import type { IBoutiqueResume } from "@/features/boutique/types/boutique.type";

export default function PageBoutiques() {
  const { boutiques: boutiquesSession } = useAuth();
  const { data: boutiquesAPI, isLoading } = useBoutiqueListQuery();
  const supprimer = useSupprimerBoutiqueMutation();

  const [modalCreationOuvert, setModalCreationOuvert] = useState(false);
  const [boutiqueIdEdition, setBoutiqueIdEdition] = useState<string | null>(null);

  const boutiques = boutiquesAPI ?? boutiquesSession;

  async function handleSupprimer(b: IBoutiqueResume) {
    const message = `Supprimer définitivement la boutique « ${b.nom} » ?\n\nLes données (catalogue, ventes, stock) ne seront plus accessibles.`;
    if (!window.confirm(message)) return;
    await supprimer.mutateAsync(b.id);
  }

  return (
    <PageContainer taille="moyen">
      <PageHeader
        titre={`${boutiques.length} boutique${boutiques.length > 1 ? "s" : ""}`}
        description={
          <>
            Gérez plusieurs boutiques avec un même compte. Chaque boutique a son propre catalogue, son stock et ses ventes.
            La modification est accessible depuis le crayon ; la suppression est réservée au propriétaire.
          </>
        }
        actions={
          <Button variant="primary" className="gap-1.5" onPress={() => setModalCreationOuvert(true)}>
            <Plus size={16} />
            Nouvelle boutique
          </Button>
        }
      />

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
                onModifier={(boutique) => setBoutiqueIdEdition(boutique.id)}
                onSupprimer={handleSupprimer}
              />
            ))}
          </div>
        )}

      <ModalCreerBoutique
        ouvert={modalCreationOuvert}
        onFermer={() => setModalCreationOuvert(false)}
      />
      <ModalModifierBoutique
        ouvert={!!boutiqueIdEdition}
        boutiqueId={boutiqueIdEdition}
        onFermer={() => setBoutiqueIdEdition(null)}
      />
    </PageContainer>
  );
}
