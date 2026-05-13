"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Skeleton, Tabs } from "@heroui/react";
import {
  ArrowLeft, Send, X, PackageCheck, MessageCircle, List, Receipt,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  useCommandeQuery, useModifierStatutCommandeMutation,
} from "@/features/achat/queries/achat.query";
import { ModalReception } from "@/features/achat/components/modal-reception";
import { SectionFrais } from "@/features/achat/components/section-frais";
import { formatMontant } from "@/features/vente/utils/format";
import {
  LIBELLE_STATUT_COMMANDE as LIBELLE_STATUT,
  CLASSES_STATUT_COMMANDE as CLASSES_STATUT,
} from "@/features/achat/utils/statut";
import { LIBELLE_METHODE_ALLOCATION } from "@/features/achat/types/achat.type";
import { useConfirmation } from "@/providers/confirmation-provider";
import { useEnvoyerBdCMutation } from "@/features/notifications/queries/notification.query";

type OngletDetail = "lignes" | "frais";

export default function PageDetailCommande({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: commande, isLoading } = useCommandeQuery(id);
  const modifierStatut = useModifierStatutCommandeMutation();
  const envoyerBdC = useEnvoyerBdCMutation();
  const [receptionOuverte, setReceptionOuverte] = useState(false);
  const [onglet, setOnglet] = useState<OngletDetail>("lignes");
  const confirmer = useConfirmation();

  async function envoyerAuFournisseur() {
    if (!commande) return;
    const ok = await confirmer({
      titre: `Envoyer la commande au fournisseur ?`,
      description: `Un message WhatsApp sera envoye a ${commande.nomFournisseur}. ` +
        `Si la commande est en brouillon, son statut passera a "Envoyee".`,
      actionLibelle: "Envoyer",
    });
    if (!ok) return;
    await envoyerBdC.mutateAsync(commande.id);
  }

  async function envoyer() {
    if (!commande) return;
    await modifierStatut.mutateAsync({ id: commande.id, statut: "SENT" });
  }

  async function annuler() {
    if (!commande) return;
    const ok = await confirmer({
      titre: "Annuler cette commande ?",
      description: "L'action est irreversible. Aucun mouvement de stock n'aura lieu.",
      actionLibelle: "Annuler la commande",
    });
    if (!ok) return;
    await modifierStatut.mutateAsync({ id: commande.id, statut: "CANCELLED" });
  }

  if (isLoading || !commande) {
    return (
      <PageContainer>
        <Skeleton className="h-24 rounded mb-4" />
        <Skeleton className="h-64 rounded" />
      </PageContainer>
    );
  }

  const peutEnvoyer = commande.statut === "DRAFT";
  const peutAnnuler = commande.statut === "DRAFT" || commande.statut === "SENT";
  const peutRecevoir = commande.statut === "SENT" || commande.statut === "PARTIAL";
  // Module 10 D3 : envoi WhatsApp possible tant que pas annulee/recue.
  const peutEnvoyerWhatsApp = commande.statut === "DRAFT"
    || commande.statut === "SENT"
    || commande.statut === "PARTIAL";

  return (
    <PageContainer>
      <PageHeader
        titre={commande.numero}
        description={`Fournisseur : ${commande.nomFournisseur}`}
        actions={
          <Button variant="ghost" className="gap-2" onPress={() => router.push("/achats/commandes")}>
            <ArrowLeft size={16} /> Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <Card.Content className="p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted text-xs">Statut</span>
              <Chip variant="soft" size="sm" className={CLASSES_STATUT[commande.statut]}>
                {LIBELLE_STATUT[commande.statut]}
              </Chip>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted text-xs">Sous-total lignes</span>
              <span className="tabular-nums">{formatMontant(commande.montantTotal)} F</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted text-xs">Frais d&apos;approche</span>
              <span className="tabular-nums">{formatMontant(commande.fraisTotal ?? 0)} F</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-xs font-medium">Cout debarque</span>
              <span className="font-semibold tabular-nums">{formatMontant(commande.totalDebarque ?? commande.montantTotal)} F</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted text-xs">Allocation</span>
              <span className="text-xs">{LIBELLE_METHODE_ALLOCATION[commande.methodeAllocation ?? "QUANTITY"]}</span>
            </div>
            {commande.dateAttendue && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted text-xs">Livraison attendue</span>
                <span>{new Date(commande.dateAttendue).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
            {commande.dateReception && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted text-xs">Premiere reception</span>
                <span>{new Date(commande.dateReception).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted text-xs">Creee le</span>
              <span>{new Date(commande.creeLe).toLocaleDateString("fr-FR")}</span>
            </div>
            {commande.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted mb-1">Notes</p>
                <p className="text-foreground whitespace-pre-line">{commande.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-border space-y-2">
              {peutEnvoyer && (
                <Button variant="primary" className="w-full gap-2" onPress={envoyer} isDisabled={modifierStatut.isPending}>
                  <Send size={14} /> Marquer comme envoyee
                </Button>
              )}
              {/* Module 10 D3 : envoi WhatsApp au fournisseur */}
              {peutEnvoyerWhatsApp && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-success border-success/30"
                  onPress={envoyerAuFournisseur}
                  isDisabled={envoyerBdC.isPending}
                >
                  <MessageCircle size={14} />
                  {envoyerBdC.isPending ? "Envoi..." : "Envoyer par WhatsApp"}
                </Button>
              )}
              {peutRecevoir && (
                <Button variant="primary" className="w-full gap-2" onPress={() => setReceptionOuverte(true)}>
                  <PackageCheck size={14} /> Receptionner
                </Button>
              )}
              {peutAnnuler && (
                <Button variant="outline" className="w-full gap-2 text-danger border-danger/30" onPress={annuler} isDisabled={modifierStatut.isPending}>
                  <X size={14} /> Annuler la commande
                </Button>
              )}
            </div>
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Content className="p-4">
            <Tabs
              selectedKey={onglet}
              onSelectionChange={(k) => setOnglet(k as OngletDetail)}
              aria-label="Sections de la commande"
              className="mb-4"
            >
              <Tabs.List>
                <Tabs.Tab id="lignes" className="px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <List size={14} />
                    Lignes ({(commande.lignes ?? []).length})
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="frais" className="px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Receipt size={14} />
                    Frais d&apos;approche
                  </span>
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            {onglet === "lignes" && (
              <div className="space-y-2">
                {(commande.lignes ?? []).map((l) => (
                  <div key={l.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.nomProduit}</p>
                      <p className="text-xs text-muted truncate">
                        {l.nomVariante ? `${l.nomVariante} · ` : ""}{l.sku}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-muted">Cmde · Recu</p>
                      <p className="tabular-nums">
                        {l.quantiteCommandee} <span className={l.quantiteRecue >= l.quantiteCommandee ? "text-success" : "text-warning"}>· {l.quantiteRecue}</span>
                      </p>
                    </div>
                    <div className="w-24 text-right">
                      <p className="text-xs text-muted">PU</p>
                      <p className="text-sm tabular-nums">{formatMontant(l.prixUnitaire)}</p>
                    </div>
                    <div className="w-24 text-right">
                      <p className="text-xs text-muted">Total</p>
                      <p className="text-sm font-semibold tabular-nums">{formatMontant(l.totalLigne)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {onglet === "frais" && (
              <SectionFrais
                commandeId={commande.id}
                modifiable={
                  commande.statut !== "RECEIVED" && commande.statut !== "CANCELLED"
                }
              />
            )}
          </Card.Content>
        </Card>
      </div>

      <ModalReception
        ouvert={receptionOuverte}
        commande={commande}
        onFermer={() => setReceptionOuverte(false)}
      />
    </PageContainer>
  );
}
