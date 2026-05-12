"use client";

import { useState } from "react";
import { Button, Card, Chip, Skeleton } from "@heroui/react";
import { Plus, Tag, Pencil, Trash2, Calendar, Users, Hash } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  usePromotionsQuery, useSupprimerPromotionMutation,
} from "@/features/promotion/queries/promotion.query";
import { ModalPromotion } from "@/features/promotion/components/modal-promotion";
import { useConfirmation } from "@/providers/confirmation-provider";
import { formatMontant } from "@/features/vente/utils/format";
import type { IPromotion } from "@/features/promotion/types/promotion.type";

export default function PagePromotions() {
  const { data: promotions, isLoading } = usePromotionsQuery();
  const supprimer = useSupprimerPromotionMutation();
  const confirmer = useConfirmation();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<IPromotion | null>(null);

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }
  function ouvrirEdition(p: IPromotion) {
    setEnEdition(p);
    setModalOuvert(true);
  }
  async function handleSupprimer(p: IPromotion) {
    const ok = await confirmer({
      titre: `Supprimer "${p.code}" ?`,
      description: "Le code ne sera plus utilisable. Les ventes deja faites ne sont pas affectees.",
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(p.id);
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Codes promo"
        description="Creer des codes de reduction (% ou montant fixe) que vos caissiers saisissent au panier."
        actions={
          <Button variant="primary" className="gap-2" onPress={ouvrirCreation}>
            <Plus size={16} /> Nouveau code
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}
        </div>
      ) : (promotions?.length ?? 0) === 0 ? (
        <Card>
          <Card.Content className="p-10 text-center">
            <Tag size={32} className="mx-auto mb-3 text-muted opacity-50" />
            <p className="text-sm text-foreground font-medium">Aucun code promo</p>
            <p className="text-xs text-muted mt-1">
              Creez votre premier code pour booster vos ventes (ex: RENTREE10 pour 10% off).
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-2">
          {(promotions ?? []).map((p) => {
            const expire = p.dateFin && new Date(p.dateFin) < new Date();
            const epuise = p.limiteUtilisations != null && p.usageCount >= p.limiteUtilisations;
            const inactive = !p.actif || expire || epuise;
            return (
              <Card key={p.id} className={inactive ? "opacity-60" : "hover:border-accent/30 transition-colors"}>
                <Card.Content className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-base font-mono font-bold text-accent">{p.code}</code>
                        <Chip className={p.type === "PERCENTAGE" ? "bg-accent/10 text-accent text-[10px]" : "bg-success/10 text-success text-[10px]"}>
                          {p.type === "PERCENTAGE" ? `${p.valeur}%` : `${formatMontant(p.valeur)} F`}
                        </Chip>
                        {!p.actif && <Chip className="bg-muted/20 text-muted text-[10px]">Inactive</Chip>}
                        {expire && <Chip className="bg-danger/10 text-danger text-[10px]">Expire</Chip>}
                        {epuise && <Chip className="bg-warning/10 text-warning text-[10px]">Epuise</Chip>}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted mt-1">{p.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        {p.montantMin > 0 && (
                          <span>Min : {formatMontant(p.montantMin)} F</span>
                        )}
                        {p.remiseMax != null && (
                          <span>Plafond : {formatMontant(p.remiseMax)} F</span>
                        )}
                        {(p.dateDebut || p.dateFin) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {p.dateDebut ? new Date(p.dateDebut).toLocaleDateString("fr-FR") : "…"}
                            {" → "}
                            {p.dateFin ? new Date(p.dateFin).toLocaleDateString("fr-FR") : "…"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Hash size={11} />
                          {p.usageCount}{p.limiteUtilisations != null ? ` / ${p.limiteUtilisations}` : " usages"}
                        </span>
                        {p.limiteParClient != null && (
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {p.limiteParClient} max / client
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 min-w-0"
                        aria-label="Modifier"
                        onPress={() => ouvrirEdition(p)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 min-w-0 text-danger"
                        aria-label="Supprimer"
                        onPress={() => handleSupprimer(p)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      <ModalPromotion
        ouvert={modalOuvert}
        promotion={enEdition}
        onFermer={() => setModalOuvert(false)}
      />
    </PageContainer>
  );
}
