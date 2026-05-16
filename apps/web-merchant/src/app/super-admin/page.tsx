"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, Button, SearchField, Label, Skeleton, Chip, Select, ListBox, toast,
} from "@heroui/react";
import {
  Building2, TrendingUp, AlertTriangle, ShieldCheck, ShieldOff,
  Users, Receipt, Wallet, Sparkles, Crown,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { superAdminAPI } from "@/features/super-admin/apis/super-admin.api";
import type { IResumeTenant } from "@/features/super-admin/types/super-admin.type";
import type { SubscriptionPlan, SubscriptionStatus } from "@/features/abonnement/types/abonnement.type";
import { formatMontant } from "@/features/vente/utils/format";

export default function PageSuperAdmin() {
  const { utilisateur, token } = useAuth();
  const [recherche, setRecherche] = useState("");
  const rechercheDeb = useDebouncedValue(recherche, 300);
  const qc = useQueryClient();

  const { data: kpis } = useQuery({
    queryKey: ["super-admin", "kpis"],
    queryFn: () => superAdminAPI.kpisGlobaux(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["super-admin", "tenants", rechercheDeb],
    queryFn: () => superAdminAPI.listerTenants(token!, rechercheDeb || undefined),
    enabled: !!token,
    staleTime: 15_000,
  });

  const basculerStatut = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: SubscriptionStatus }) =>
      superAdminAPI.basculerStatut(token!, id, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: Error) => toast.danger(e.message || "Erreur"),
  });

  const forcerPlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: SubscriptionPlan }) =>
      superAdminAPI.forcerPlan(token!, id, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Plan mis à jour");
    },
    onError: (e: Error) => toast.danger(e.message || "Erreur"),
  });

  // Garde role : la page ne s'affiche que pour SUPER_ADMIN. Le backend
  // refuse de toute facon, mais on evite d'afficher la page.
  if (utilisateur && utilisateur.role !== "SUPER_ADMIN") {
    return (
      <PageContainer>
        <Card>
          <Card.Content className="p-8 text-center">
            <AlertTriangle size={32} className="mx-auto text-danger mb-2" />
            <p className="text-base font-semibold">Accès refusé</p>
            <p className="text-sm text-muted mt-1">Cette page est réservée aux super-administrateurs LIBITEX.</p>
          </Card.Content>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Plateforme — Super Admin"
        description="Pilotage global de tous les tenants LIBITEX : abonnements, statuts, métriques agrégées."
      />

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard libelle="Tenants" valeur={kpis?.nbTenants ?? 0} icone={Building2} classes="bg-accent/10 text-accent" />
        <KpiCard libelle="Actifs" valeur={kpis?.nbTenantsActifs ?? 0} icone={ShieldCheck} classes="bg-success/10 text-success" sous={`${kpis?.nbTenantsTrial ?? 0} en essai`} />
        <KpiCard libelle="Suspendus" valeur={kpis?.nbTenantsSuspendus ?? 0} icone={ShieldOff} classes="bg-danger/10 text-danger" />
        <KpiCard
          libelle="CA global"
          valeur={kpis ? formatMontant(kpis.caGlobal) : "—"}
          unite="F CFA"
          icone={Wallet}
          classes="bg-warning/10 text-warning"
          sous={kpis ? `${kpis.nbTicketsGlobal} tickets · ${kpis.nbUtilisateursGlobal} users` : ""}
        />
      </div>

      {/* Recherche */}
      <div className="mb-4 max-w-md">
        <SearchField value={recherche} onChange={setRecherche}>
          <Label className="sr-only">Rechercher un tenant</Label>
          <SearchField.Input placeholder="Rechercher par nom, slug ou email..." />
        </SearchField>
      </div>

      {/* Liste tenants */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (tenants ?? []).length === 0 ? (
        <Card>
          <Card.Content className="p-8 text-center text-muted">
            Aucun tenant ne correspond à cette recherche.
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-2">
          {(tenants ?? []).map((t) => (
            <CarteTenant
              key={t.id}
              tenant={t}
              onBasculerStatut={(s) => basculerStatut.mutate({ id: t.id, statut: s })}
              onForcerPlan={(p) => forcerPlan.mutate({ id: t.id, plan: p })}
              enChangement={basculerStatut.isPending || forcerPlan.isPending}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function KpiCard({
  libelle, valeur, icone: Icone, classes, unite, sous,
}: {
  libelle: string;
  valeur: number | string;
  icone: typeof Building2;
  classes: string;
  unite?: string;
  sous?: string;
}) {
  return (
    <Card>
      <Card.Content className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${classes}`}>
            <Icone size={16} />
          </span>
        </div>
        <p className="text-xs text-muted uppercase tracking-wider">{libelle}</p>
        <p className="text-xl font-semibold text-foreground tabular-nums mt-0.5">
          {valeur}
          {unite && <span className="text-xs text-muted font-normal ml-1">{unite}</span>}
        </p>
        {sous && <p className="text-[11px] text-muted mt-1 truncate">{sous}</p>}
      </Card.Content>
    </Card>
  );
}

function CarteTenant({
  tenant, onBasculerStatut, onForcerPlan, enChangement,
}: {
  tenant: IResumeTenant;
  onBasculerStatut: (statut: SubscriptionStatus) => void;
  onForcerPlan: (plan: SubscriptionPlan) => void;
  enChangement: boolean;
}) {
  const couleurStatut = tenant.statut === "ACTIVE" ? "bg-success/10 text-success"
    : tenant.statut === "TRIAL" ? "bg-accent/10 text-accent"
    : tenant.statut === "SUSPENDED" ? "bg-danger/10 text-danger"
    : "bg-muted/10 text-muted";

  return (
    <Card>
      <Card.Content className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-base font-semibold text-foreground truncate">{tenant.nom}</p>
              <Chip className="text-[10px] bg-muted/10 text-muted font-mono">{tenant.slug}</Chip>
              <Chip className={`text-[10px] ${couleurStatut}`}>{tenant.statut}</Chip>
              <Chip className="text-[10px] bg-foreground/5 text-foreground">{tenant.planLibelle}</Chip>
            </div>
            <p className="text-xs text-muted mb-2">
              {tenant.email ?? "—"}
              {" · "}
              {tenant.secteurActivite}
              {" · créé le "}
              {new Date(tenant.creeLe).toLocaleDateString("fr-FR")}
              {tenant.statut === "TRIAL" && tenant.joursRestants !== null && (
                <> · <span className="text-warning font-medium">{tenant.joursRestants}j restants</span></>
              )}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Users size={11} />
                <span className="font-semibold text-foreground tabular-nums">{tenant.nbUtilisateurs}</span> users
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles size={11} />
                <span className="font-semibold text-foreground tabular-nums">{tenant.nbProduits}</span> produits
              </span>
              <span className="inline-flex items-center gap-1">
                <Receipt size={11} />
                <span className="font-semibold text-foreground tabular-nums">{tenant.nbTickets}</span> tickets
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp size={11} />
                <span className="font-semibold text-foreground tabular-nums">{formatMontant(tenant.caTotal)}</span> F
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Select
              selectedKey={tenant.plan}
              onSelectionChange={(k) => onForcerPlan(k as SubscriptionPlan)}
              aria-label="Forcer un plan"
              className="min-w-[140px]"
              isDisabled={enChangement}
            >
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="TRIAL" textValue="Essai">Essai</ListBox.Item>
                  <ListBox.Item id="STARTER" textValue="Starter">Starter</ListBox.Item>
                  <ListBox.Item id="PRO" textValue="Pro">Pro</ListBox.Item>
                  <ListBox.Item id="BUSINESS" textValue="Business">Business</ListBox.Item>
                  <ListBox.Item id="ENTERPRISE" textValue="Enterprise">Enterprise</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            {tenant.statut === "SUSPENDED" ? (
              <Button
                variant="secondary"
                className="gap-1.5 text-xs"
                onPress={() => onBasculerStatut("ACTIVE")}
                isDisabled={enChangement}
              >
                <ShieldCheck size={14} />
                Réactiver
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="gap-1.5 text-xs text-danger hover:bg-danger/5"
                onPress={() => onBasculerStatut("SUSPENDED")}
                isDisabled={enChangement}
              >
                <ShieldOff size={14} />
                Suspendre
              </Button>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
