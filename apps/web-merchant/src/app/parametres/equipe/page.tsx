"use client";

import { useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { UserPlus, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import {
  useEquipeListQuery, useRetirerMembreMutation,
} from "@/features/equipe/queries/equipe.query";
import { CarteMembre } from "@/features/equipe/components/carte-membre";
import { ModalInviterMembre } from "@/features/equipe/components/modal-inviter-membre";
import { ModalModifierMembre } from "@/features/equipe/components/modal-modifier-membre";
import type { IMembre } from "@/features/equipe/types/equipe.type";
import { useConfirmation } from "@/providers/confirmation-provider";

export default function PageEquipe() {
  const { utilisateur } = useAuth();
  const { data: membres, isLoading } = useEquipeListQuery();
  const { data: emplacements } = useEmplacementListQuery();
  const retirer = useRetirerMembreMutation();
  const confirmer = useConfirmation();

  const [modalInviter, setModalInviter] = useState(false);
  const [membreModif, setMembreModif] = useState<IMembre | null>(null);

  async function confirmerRetrait(m: IMembre) {
    const nom = `${m.prenom} ${m.nomFamille}`;
    const ok = await confirmer({
      titre: "Retirer ce membre ?",
      description: `${nom} perdra l'accès à cette boutique. Son compte personnel et ses autres boutiques sont conservés.`,
      actionLibelle: "Retirer",
    });
    if (!ok) return;
    retirer.mutate(m.membershipId);
  }

  return (
    <PageContainer>
      <PageHeader
        titre={`${(membres ?? []).length} membre${(membres ?? []).length > 1 ? "s" : ""}`}
        description="Invitez vos collaborateurs, attribuez-leur un rôle et limitez leur accès aux bons points de vente."
        actions={
          <Button variant="primary" className="gap-1.5" onPress={() => setModalInviter(true)}>
            <UserPlus size={16} />
            Inviter un membre
          </Button>
        }
      />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)}
          </div>
        ) : (membres ?? []).length === 0 ? (
          <EmptyState
            icone={Users}
            titre="Aucun membre"
            description="Vous êtes seul sur cette boutique. Invitez un caissier ou un manager pour commencer."
            action={
              <Button variant="primary" className="gap-1.5" onPress={() => setModalInviter(true)}>
                <UserPlus size={16} />
                Inviter le premier membre
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(membres ?? []).map((m) => (
              <CarteMembre
                key={m.membershipId}
                membre={m}
                emplacements={emplacements ?? []}
                estCourant={m.userId === utilisateur?.id}
                onModifier={() => setMembreModif(m)}
                onRetirer={() => confirmerRetrait(m)}
              />
            ))}
          </div>
        )}

      <ModalInviterMembre ouvert={modalInviter} onFermer={() => setModalInviter(false)} />
      <ModalModifierMembre membre={membreModif} onFermer={() => setMembreModif(null)} />
    </PageContainer>
  );
}
