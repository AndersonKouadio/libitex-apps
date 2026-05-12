"use client";

import { useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { Plus, Store } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBoutiqueListQuery } from "@/features/boutique/queries/boutique-list.query";
import { useSupprimerBoutiqueMutation } from "@/features/boutique/queries/boutique.mutations";
import { useSwitcherBoutiqueMutation } from "@/features/boutique/queries/boutique-switch.mutation";
import { CarteBoutique } from "@/features/boutique/components/carte-boutique";
import { ModalCreerBoutique } from "@/features/boutique/components/modal-creer-boutique";
import type { IBoutiqueResume } from "@/features/boutique/types/boutique.type";
import { useConfirmation } from "@/providers/confirmation-provider";

export default function PageBoutiques() {
  const { boutiques: boutiquesSession, boutiqueActive } = useAuth();
  const { data: boutiquesAPI, isLoading } = useBoutiqueListQuery();
  const supprimer = useSupprimerBoutiqueMutation();
  const switcher = useSwitcherBoutiqueMutation();
  const confirmer = useConfirmation();

  const [modalCreationOuvert, setModalCreationOuvert] = useState(false);

  const boutiques = boutiquesAPI ?? boutiquesSession;

  async function handleSupprimer(b: IBoutiqueResume) {
    const ok = await confirmer({
      titre: `Supprimer la boutique « ${b.nom} » ?`,
      description: "Les données (catalogue, stock, ventes) ne seront plus accessibles. Cette action ne peut pas être annulée par vous-même.",
      actionLibelle: "Supprimer la boutique",
    });
    if (!ok) return;
    // Si on supprime la boutique active, on bascule d'abord sur une autre pour que
    // le JWT ne pointe plus vers le tenant qui va etre soft-supprime.
    if (boutiqueActive?.id === b.id) {
      const autre = boutiques.find((x) => x.id !== b.id);
      if (autre) await switcher.mutateAsync(autre.id);
    }
    await supprimer.mutateAsync(b.id);
  }

  return (
    <PageContainer>
      <PageHeader
        titre={`${boutiques.length} boutique${boutiques.length > 1 ? "s" : ""}`}
        description={
          <>
            Gérez plusieurs boutiques avec un même compte. Chaque boutique a son propre catalogue, son stock et ses ventes.
            Pour modifier le profil (nom, secteur, contact, adresse), basculez sur la boutique puis ouvrez « Profil de la boutique » dans Paramètres.
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
          <EmptyState
            icone={Store}
            titre="Aucune boutique"
            description="Créez votre première boutique pour commencer."
            action={
              <Button variant="primary" className="gap-1.5" onPress={() => setModalCreationOuvert(true)}>
                <Plus size={16} />
                Créer une boutique
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boutiques.map((b) => (
              <CarteBoutique
                key={b.id}
                boutique={b}
                onSupprimer={handleSupprimer}
              />
            ))}
          </div>
        )}

      <ModalCreerBoutique
        ouvert={modalCreationOuvert}
        onFermer={() => setModalCreationOuvert(false)}
      />
    </PageContainer>
  );
}
