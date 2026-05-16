"use client";

import { Button, Card, Skeleton } from "@heroui/react";
import { CheckCircle2, AlertTriangle, Crown, Zap, Building2, Sparkles, Check, X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAbonnementQuery, usePlansQuery, useChangerPlanMutation } from "@/features/abonnement/queries/abonnement.query";
import type { SubscriptionPlan, IPlanDispo } from "@/features/abonnement/types/abonnement.type";
import { formatMontant } from "@/features/vente/utils/format";

const ICONES_PLAN: Record<SubscriptionPlan, typeof Sparkles> = {
  TRIAL: Sparkles,
  STARTER: Zap,
  PRO: Crown,
  BUSINESS: Building2,
  ENTERPRISE: Building2,
};

const COULEURS_PLAN: Record<SubscriptionPlan, string> = {
  TRIAL: "bg-muted/10 text-muted",
  STARTER: "bg-success/10 text-success",
  PRO: "bg-accent/10 text-accent",
  BUSINESS: "bg-warning/10 text-warning",
  ENTERPRISE: "bg-danger/10 text-danger",
};

export default function PageAbonnement() {
  const { data: abo, isLoading } = useAbonnementQuery();
  const { data: plans } = usePlansQuery();
  const changer = useChangerPlanMutation();

  if (isLoading || !abo) {
    return (
      <PageContainer>
        <Skeleton className="h-40 rounded-xl mb-4" />
        <Skeleton className="h-96 rounded-xl" />
      </PageContainer>
    );
  }

  const IconePlanActif = ICONES_PLAN[abo.plan];

  return (
    <PageContainer>
      <PageHeader
        titre="Abonnement"
        description="Plan souscrit, utilisation actuelle et limites. Passez à un plan supérieur pour débloquer plus de boutiques, d'utilisateurs et de produits."
      />

      {/* Bandeau état actuel */}
      <Card className="mb-5">
        <Card.Content className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <span className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${COULEURS_PLAN[abo.plan]}`}>
              <IconePlanActif size={28} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-semibold text-foreground">Plan {abo.libelle}</h3>
                {abo.statut === "TRIAL" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {abo.joursRestants !== null ? `${abo.joursRestants}j restants` : "Essai en cours"}
                  </span>
                )}
                {abo.statut === "ACTIVE" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                    Actif
                  </span>
                )}
                {abo.statut === "SUSPENDED" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium inline-flex items-center gap-1">
                    <AlertTriangle size={11} /> Suspendu
                  </span>
                )}
              </div>
              <p className="text-sm text-muted mt-1">
                {abo.prixMensuelFcfa > 0
                  ? `${formatMontant(abo.prixMensuelFcfa)} F CFA / mois`
                  : abo.plan === "ENTERPRISE" ? "Tarif sur devis" : "Gratuit"}
                {abo.prochaineFacturation && (
                  <> · prochaine échéance le {new Date(abo.prochaineFacturation).toLocaleDateString("fr-FR")}</>
                )}
              </p>
            </div>
          </div>

          {/* Usage vs limites */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Usage libelle="Utilisateurs" usage={abo.usage.utilisateurs} limite={abo.limites.maxUtilisateurs} />
            <Usage libelle="Produits" usage={abo.usage.produits} limite={abo.limites.maxProduits} />
            <Usage libelle="Emplacements" usage={abo.usage.emplacements} limite={abo.limites.maxEmplacements} />
            <Usage libelle="Boutiques" usage={abo.usage.boutiques} limite={abo.limites.maxBoutiques} />
          </div>
        </Card.Content>
      </Card>

      {/* Grille des plans disponibles */}
      <h2 className="text-base font-semibold text-foreground mb-3">Changer de plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(plans ?? []).map((p) => (
          <CartePlan
            key={p.plan}
            plan={p}
            planActuel={abo.plan}
            enChangement={changer.isPending}
            onSelectionner={() => changer.mutate(p.plan)}
          />
        ))}
      </div>
    </PageContainer>
  );
}

function Usage({ libelle, usage, limite }: { libelle: string; usage: number; limite: number | null }) {
  const ratio = limite === null ? 0 : Math.min(1, usage / limite);
  const alerte = limite !== null && ratio >= 0.8;
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted uppercase tracking-wider">{libelle}</p>
      <p className="text-lg font-semibold text-foreground tabular-nums mt-0.5">
        {usage}
        {limite !== null && <span className="text-sm text-muted font-normal"> / {limite}</span>}
        {limite === null && <span className="text-sm text-muted font-normal"> · illimité</span>}
      </p>
      {limite !== null && (
        <div className="h-1 mt-2 rounded-full bg-foreground/5 overflow-hidden">
          <div
            className={`h-full transition-all ${alerte ? "bg-warning" : "bg-accent"}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CartePlan({
  plan, planActuel, enChangement, onSelectionner,
}: {
  plan: IPlanDispo;
  planActuel: SubscriptionPlan;
  enChangement: boolean;
  onSelectionner: () => void;
}) {
  const Icone = ICONES_PLAN[plan.plan];
  const estActuel = plan.plan === planActuel;
  const features = [
    { libelle: "Multi-tarifs B2B", actif: plan.limites.features.b2b },
    { libelle: "Multi-devises", actif: plan.limites.features.multiDevise },
    { libelle: "Domaine personnalisé", actif: plan.limites.features.customDomain },
    { libelle: "Accès API", actif: plan.limites.features.apiAccess },
    { libelle: "Marketplace", actif: plan.limites.features.marketplace },
  ];

  return (
    <Card className={estActuel ? "border-accent ring-1 ring-accent/30" : ""}>
      <Card.Content className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${COULEURS_PLAN[plan.plan]}`}>
            <Icone size={16} />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">{plan.libelle}</p>
            <p className="text-xs text-muted">
              {plan.prixMensuelFcfa > 0
                ? `${formatMontant(plan.prixMensuelFcfa)} F / mois`
                : plan.plan === "ENTERPRISE" ? "Sur devis" : "Gratuit"}
            </p>
          </div>
        </div>

        <ul className="space-y-1.5 text-xs text-foreground mb-4 flex-1">
          <li className="flex items-center gap-2">
            <Check size={12} className="text-success shrink-0" />
            {plan.limites.maxUtilisateurs === null
              ? "Utilisateurs illimités"
              : `Jusqu'à ${plan.limites.maxUtilisateurs} utilisateurs`}
          </li>
          <li className="flex items-center gap-2">
            <Check size={12} className="text-success shrink-0" />
            {plan.limites.maxProduits === null
              ? "Produits illimités"
              : `Jusqu'à ${plan.limites.maxProduits.toLocaleString("fr-FR")} produits`}
          </li>
          <li className="flex items-center gap-2">
            <Check size={12} className="text-success shrink-0" />
            {plan.limites.maxEmplacements === null
              ? "Emplacements illimités"
              : `Jusqu'à ${plan.limites.maxEmplacements} emplacements`}
          </li>
          {features.map((f) => (
            <li key={f.libelle} className="flex items-center gap-2">
              {f.actif ? (
                <Check size={12} className="text-success shrink-0" />
              ) : (
                <X size={12} className="text-muted/40 shrink-0" />
              )}
              <span className={f.actif ? "text-foreground" : "text-muted/50"}>{f.libelle}</span>
            </li>
          ))}
        </ul>

        {estActuel ? (
          <Button variant="ghost" isDisabled className="gap-1.5">
            <CheckCircle2 size={14} /> Plan actuel
          </Button>
        ) : (
          <Button
            variant="primary"
            onPress={onSelectionner}
            isDisabled={enChangement}
            className="w-full"
          >
            {enChangement ? "..." : "Choisir ce plan"}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
