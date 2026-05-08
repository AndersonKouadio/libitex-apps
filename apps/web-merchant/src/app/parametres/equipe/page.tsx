"use client";

import { useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { UserPlus, Users } from "lucide-react";
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

export default function PageEquipe() {
  const { utilisateur } = useAuth();
  const { data: membres, isLoading } = useEquipeListQuery();
  const { data: emplacements } = useEmplacementListQuery();
  const retirer = useRetirerMembreMutation();

  const [modalInviter, setModalInviter] = useState(false);
  const [membreModif, setMembreModif] = useState<IMembre | null>(null);

  function confirmerRetrait(m: IMembre) {
    const nom = `${m.prenom} ${m.nomFamille}`;
    if (window.confirm(`Retirer ${nom} de la boutique ? Son compte est conservé mais perdra l'accès.`)) {
      retirer.mutate(m.membershipId);
    }
  }

  return (
    <PageContainer taille="moyen">
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
          <Card>
            <Card.Content className="py-16 text-center">
              <Users size={32} className="text-muted/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Aucun membre</p>
              <p className="text-sm text-muted mt-1 mb-4">
                Vous êtes seul sur cette boutique. Invitez un caissier ou un manager pour commencer.
              </p>
              <Button variant="primary" className="gap-1.5" onPress={() => setModalInviter(true)}>
                <UserPlus size={16} />
                Inviter le premier membre
              </Button>
            </Card.Content>
          </Card>
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
