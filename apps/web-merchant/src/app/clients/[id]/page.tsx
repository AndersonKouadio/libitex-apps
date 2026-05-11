"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card, Button, Skeleton, Chip,
} from "@heroui/react";
import {
  ArrowLeft, Pencil, Trash2, Phone, Mail, MapPin, StickyNote, UserPlus,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  useClientDetailQuery, useKpisClientQuery, useSupprimerClientMutation,
} from "@/features/client/queries/client.query";
import { ModalClient } from "@/features/client/components/modal-client";
import { KpisClient } from "@/features/client/components/kpis-client";
import { HistoriqueClient } from "@/features/client/components/historique-client";
import { useConfirmation } from "@/providers/confirmation-provider";

interface Props {
  params: Promise<{ id: string }>;
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "long", year: "numeric",
});

export default function PageClientDetail({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const confirmer = useConfirmation();
  const supprimer = useSupprimerClientMutation();

  const [editionOuverte, setEditionOuverte] = useState(false);

  const { data: client, isLoading } = useClientDetailQuery(id);
  const { data: kpis } = useKpisClientQuery(id);

  async function handleSupprimer() {
    if (!client) return;
    const nom = [client.prenom, client.nomFamille].filter(Boolean).join(" ");
    const ok = await confirmer({
      titre: "Supprimer ce client ?",
      description: `Le client « ${nom} » sera supprimé. Son historique d'achats reste consultable depuis les rapports.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(id);
    router.push("/clients");
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-64 rounded mb-3" />
        <Skeleton className="h-24 rounded-xl mb-4" />
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </PageContainer>
    );
  }

  if (!client) {
    return (
      <PageContainer>
        <Card>
          <Card.Content className="py-16 text-center">
            <p className="text-sm text-foreground">Client introuvable</p>
            <Link href="/clients">
              <Button variant="primary" className="mt-3 gap-1.5">
                <ArrowLeft size={14} /> Retour à la liste
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </PageContainer>
    );
  }

  const nomComplet = [client.prenom, client.nomFamille].filter(Boolean).join(" ");
  const initiale = client.prenom[0]?.toUpperCase() ?? "?";

  return (
    <PageContainer>
      <PageHeader
        titre={nomComplet}
        description={client.creeLe ? `Client depuis le ${FORMAT_DATE.format(new Date(client.creeLe))}` : undefined}
        actions={
          <>
            <Link href="/clients">
              <Button variant="ghost" className="gap-1.5 text-xs">
                <ArrowLeft size={14} /> Retour
              </Button>
            </Link>
            <Button variant="secondary" className="gap-1.5" onPress={() => setEditionOuverte(true)}>
              <Pencil size={14} /> Modifier
            </Button>
            <Button
              variant="ghost"
              className="gap-1.5 text-danger hover:bg-danger/5"
              onPress={handleSupprimer}
              isDisabled={supprimer.isPending}
            >
              <Trash2 size={14} /> Supprimer
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Card.Content className="p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <span className="w-14 h-14 rounded-full bg-accent/10 text-accent text-xl font-semibold flex items-center justify-center shrink-0">
              {initiale}
            </span>
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <FicheLigne icone={Phone} libelle="Téléphone" valeur={client.telephone} />
              <FicheLigne icone={Mail} libelle="Email" valeur={client.email} />
              <FicheLigne icone={MapPin} libelle="Adresse" valeur={client.adresse} />
              <FicheLigne icone={StickyNote} libelle="Notes" valeur={client.notes} />
            </div>
          </div>
        </Card.Content>
      </Card>

      {kpis && (
        <div className="mb-4">
          <KpisClient kpis={kpis} />
        </div>
      )}

      <HistoriqueClient clientId={id} />

      <ModalClient
        ouvert={editionOuverte}
        client={client}
        onFermer={() => setEditionOuverte(false)}
      />
    </PageContainer>
  );
}

function FicheLigne({
  icone: Icone, libelle, valeur,
}: { icone: typeof Phone; libelle: string; valeur: string | null }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icone size={14} className="text-muted shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted uppercase tracking-wider">{libelle}</p>
        <p className={`text-sm ${valeur ? "text-foreground" : "text-muted/60"}`}>
          {valeur || "—"}
        </p>
      </div>
    </div>
  );
}
