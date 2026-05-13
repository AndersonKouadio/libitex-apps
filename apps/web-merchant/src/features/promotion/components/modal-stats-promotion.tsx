"use client";

import { Modal, Skeleton, Card } from "@heroui/react";
import { BarChart3, Receipt, Coins, Users, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { useStatsPromotionQuery } from "../queries/promotion.query";
import type { IPromotion } from "../types/promotion.type";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  promotion: IPromotion | null;
  onFermer: () => void;
}

/**
 * Module 11 D3 : modal de stats pour un code promo.
 * - 3 KPI : usages / total remise distribuee / CA genere
 * - Top 5 clients utilisateurs (si client lie aux tickets)
 */
export function ModalStatsPromotion({ promotion, onFermer }: Props) {
  const { data: stats, isLoading } = useStatsPromotionQuery(promotion?.id ?? null);

  return (
    <Modal.Backdrop isOpen={!!promotion} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <BarChart3 className="size-5" />
            </Modal.Icon>
            <Modal.Heading>
              Statistiques — {promotion?.code}
            </Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {isLoading || !stats ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[88px] rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-32 rounded-xl" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <KPI
                    icone={Receipt}
                    libelle="Usages"
                    valeur={String(stats.nbUsages)}
                    tone="accent"
                  />
                  <KPI
                    icone={Coins}
                    libelle="Remise distribuee"
                    valeur={formatMontant(stats.totalRemise)}
                    unite="F"
                    tone="warning"
                  />
                  <KPI
                    icone={TrendingUp}
                    libelle="CA genere"
                    valeur={formatMontant(stats.caGenere)}
                    unite="F"
                    tone="success"
                  />
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users size={12} /> Top 5 clients utilisateurs
                  </h4>
                  {stats.topClients.length === 0 ? (
                    <EmptyState
                      variante="subtle"
                      icone={Users}
                      titre="Aucun client lie aux usages"
                      description="Ce code a ete utilise sur des tickets sans client rattache."
                    />
                  ) : (
                    <Card>
                      <Card.Content className="p-0">
                        <ul className="divide-y divide-border">
                          {stats.topClients.map((c, i) => (
                            <li key={c.customerId} className="flex items-center gap-3 px-3 py-2.5">
                              <span className="w-7 h-7 rounded-full bg-muted/10 text-muted text-xs font-bold flex items-center justify-center shrink-0">
                                #{i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.nomComplet}</p>
                                <p className="text-xs text-muted">
                                  {c.nbUsages} usage{c.nbUsages > 1 ? "s" : ""}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-warning tabular-nums">
                                -{formatMontant(c.totalRemise)}
                                <span className="text-xs font-normal text-muted ml-0.5">F</span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      </Card.Content>
                    </Card>
                  )}
                </div>

                <p className="text-[11px] text-muted">
                  Le CA genere = somme des tickets utilisant ce code, total deja remise deduite.
                  La remise distribuee = somme des montants reduits via ce code.
                </p>
              </>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

interface KPIProps {
  icone: typeof Receipt;
  libelle: string;
  valeur: string;
  unite?: string;
  tone: "accent" | "warning" | "success";
}

function KPI({ icone: Icone, libelle, valeur, unite, tone }: KPIProps) {
  const tones: Record<KPIProps["tone"], string> = {
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  };
  return (
    <Card>
      <Card.Content className="p-3">
        <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center mb-2 ${tones[tone]}`}>
          <Icone size={14} />
        </span>
        <p className="text-xs text-muted">{libelle}</p>
        <p className="text-lg font-bold tabular-nums">
          {valeur}
          {unite && <span className="text-xs font-normal text-muted ml-0.5">{unite}</span>}
        </p>
      </Card.Content>
    </Card>
  );
}
