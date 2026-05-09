"use client";

import { useState, useMemo } from "react";
import {
  Select, ListBox, Spinner, Chip, Button,
} from "@heroui/react";
import {
  History, Banknote, Receipt, TrendingUp, AlertTriangle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CarteKpi } from "@/features/tableau-de-bord/components/carte-kpi";
import { useSessionListQuery } from "@/features/session-caisse/queries/session-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import {
  formatMontant, formatDateRelative, formatHeure, formatDuree, cleJour,
} from "@/features/vente/utils/format";
import type { ISessionCaisse } from "@/features/session-caisse/types/session-caisse.type";

type FiltreStatut = "TOUS" | "OPEN" | "CLOSED";

interface GroupeJour {
  cle: string;
  libelle: string;
  sessions: ISessionCaisse[];
  totalRecettes: number;
  totalTickets: number;
}

export default function PageHistoriqueSessions() {
  const { data: emplacements } = useEmplacementListQuery();
  const [empId, setEmpId] = useState<string>("");
  const [statut, setStatut] = useState<FiltreStatut>("TOUS");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSessionListQuery({
    emplacementId: empId || undefined,
    statut: statut === "TOUS" ? undefined : statut,
    page,
    limit: 50,
  });

  const sessions = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const stores = (emplacements ?? []).filter((e) => e.type === "STORE");

  // Regroupe les sessions par jour d'ouverture. Les sessions sont deja
  // triees par ouvertA DESC cote backend, donc l'ordre des groupes suit.
  const groupes = useMemo<GroupeJour[]>(() => {
    const parJour = new Map<string, GroupeJour>();
    for (const s of sessions) {
      const cle = cleJour(s.ouvertA);
      let g = parJour.get(cle);
      if (!g) {
        g = {
          cle,
          libelle: formatDateRelative(s.ouvertA),
          sessions: [],
          totalRecettes: 0,
          totalTickets: 0,
        };
        parJour.set(cle, g);
      }
      g.sessions.push(s);
      g.totalRecettes += s.totalEncaisse ?? 0;
      g.totalTickets += s.nombreTickets ?? 0;
    }
    return Array.from(parJour.values());
  }, [sessions]);

  // KPIs agreges sur les sessions chargees (page courante).
  // Pour le MVP on calcule cote front : si l'utilisateur veut des KPIs sur
  // tout l'historique, on ajoutera un endpoint dedie cote backend.
  const kpis = useMemo(() => {
    const recettes = sessions.reduce((s, x) => s + (x.totalEncaisse ?? 0), 0);
    const tickets = sessions.reduce((s, x) => s + (x.nombreTickets ?? 0), 0);
    const moyen = tickets > 0 ? recettes / tickets : 0;
    const ecartEspeces = sessions
      .filter((s) => s.statut === "CLOSED")
      .reduce((s, x) => s + (x.ecart?.CASH ?? 0), 0);
    return { recettes, tickets, moyen, ecartEspeces };
  }, [sessions]);

  return (
    <PageContainer>
      <PageHeader
        titre={`${total} session${total > 1 ? "s" : ""}`}
        description="Toutes les sessions de caisse, ouvertes ou fermees, avec les ecarts de comptage."
        actions={
          <>
            <Select
              selectedKey={empId || "all"}
              onSelectionChange={(k) => { setEmpId(k === "all" ? "" : String(k)); setPage(1); }}
              aria-label="Emplacement"
              className="min-w-[180px]"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="Tous">Tous les emplacements</ListBox.Item>
                  {stores.map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={statut}
              onSelectionChange={(k) => { setStatut(k as FiltreStatut); setPage(1); }}
              aria-label="Statut"
              className="min-w-[140px]"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="TOUS" textValue="Tous">Toutes</ListBox.Item>
                  <ListBox.Item id="OPEN" textValue="Ouvertes">Ouvertes</ListBox.Item>
                  <ListBox.Item id="CLOSED" textValue="Fermees">Fermees</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </>
        }
      />

      {!isLoading && sessions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <CarteKpi
            libelle="Recettes"
            valeur={formatMontant(kpis.recettes)}
            unite="F CFA"
            icone={Banknote}
            classesIcone="bg-accent/10 text-accent"
          />
          <CarteKpi
            libelle="Tickets"
            valeur={String(kpis.tickets)}
            icone={Receipt}
            classesIcone="bg-warning/10 text-warning"
          />
          <CarteKpi
            libelle="Ticket moyen"
            valeur={formatMontant(kpis.moyen)}
            unite="F CFA"
            icone={TrendingUp}
            classesIcone="bg-success/10 text-success"
          />
          <CarteKpi
            libelle="Écart espèces"
            valeur={`${kpis.ecartEspeces > 0 ? "+" : ""}${formatMontant(kpis.ecartEspeces)}`}
            unite="F CFA"
            icone={AlertTriangle}
            classesIcone={
              kpis.ecartEspeces === 0
                ? "bg-muted/10 text-muted"
                : kpis.ecartEspeces > 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }
          />
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <History size={32} className="text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-foreground">Aucune session pour ces filtres</p>
          <p className="text-xs text-muted mt-1">Les sessions apparaitront ici une fois la caisse ouverte.</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {groupes.map((g) => <GroupeJourBloc key={g.cle} groupe={g} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-sm">
              <p className="text-xs text-muted">
                {total} session(s) — page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  isDisabled={page === 1}
                >
                  Precedent
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  isDisabled={page >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

function GroupeJourBloc({ groupe }: { groupe: GroupeJour }) {
  return (
    <section>
      <header className="flex items-baseline justify-between gap-2 mb-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">{groupe.libelle}</h2>
        <p className="text-xs text-muted">
          {groupe.sessions.length} session{groupe.sessions.length > 1 ? "s" : ""} ·{" "}
          {groupe.totalTickets} ticket{groupe.totalTickets > 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatMontant(groupe.totalRecettes)} F
          </span>
        </p>
      </header>
      <div className="space-y-2">
        {groupe.sessions.map((s) => <CarteSession key={s.id} session={s} />)}
      </div>
    </section>
  );
}

function CarteSession({ session }: { session: ISessionCaisse }) {
  const ouverte = session.statut === "OPEN";
  const ecartCash = session.ecart?.CASH ?? 0;
  const aEcart = ecartCash !== 0;
  const dureeMinutes = session.fermeA
    ? Math.round((new Date(session.fermeA).getTime() - new Date(session.ouvertA).getTime()) / 60000)
    : Math.round((Date.now() - new Date(session.ouvertA).getTime()) / 60000);
  const horaire = session.fermeA
    ? `${formatHeure(session.ouvertA)} → ${formatHeure(session.fermeA)}`
    : `depuis ${formatHeure(session.ouvertA)}`;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 hover:border-accent/30 transition-colors">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-foreground tabular-nums">{horaire}</p>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted tabular-nums">{formatDuree(dureeMinutes)}</span>
            <Chip className={`text-[10px] gap-1 ${
              ouverte ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
            }`}>
              {ouverte ? "Ouverte" : "Fermee"}
            </Chip>
            {aEcart && session.statut === "CLOSED" && (
              <Chip className={`text-[10px] tabular-nums ${
                ecartCash > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}>
                Ecart espèces {ecartCash > 0 ? "+" : ""}{formatMontant(ecartCash)} F
              </Chip>
            )}
          </div>
          <p className="text-xs text-muted truncate">
            {session.caissierNom} — {session.emplacementNom}
            <span className="font-mono ml-2 text-[10px] opacity-50">{session.numeroSession}</span>
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
            <span className="text-muted">
              Tickets <span className="text-foreground font-medium tabular-nums">{session.nombreTickets ?? 0}</span>
            </span>
            <span className="text-muted">·</span>
            <span className="text-muted">
              Recettes <span className="text-foreground font-semibold tabular-nums">
                {formatMontant(session.totalEncaisse ?? 0)} F
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
