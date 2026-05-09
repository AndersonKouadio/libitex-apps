"use client";

import { useState } from "react";
import {
  Select, ListBox, Label, Spinner, Chip, Button,
} from "@heroui/react";
import { History } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { useSessionListQuery } from "@/features/session-caisse/queries/session-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { formatMontant } from "@/features/vente/utils/format";
import type { ISessionCaisse } from "@/features/session-caisse/types/session-caisse.type";

type FiltreStatut = "TOUS" | "OPEN" | "CLOSED";

export default function PageHistoriqueSessions() {
  const { data: emplacements } = useEmplacementListQuery();
  const [empId, setEmpId] = useState<string>("");
  const [statut, setStatut] = useState<FiltreStatut>("TOUS");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSessionListQuery({
    emplacementId: empId || undefined,
    statut: statut === "TOUS" ? undefined : statut,
    page,
    limit: 20,
  });

  const sessions = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const stores = (emplacements ?? []).filter((e) => e.type === "STORE");

  return (
    <PageContainer>
      <header className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          <History size={18} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Historique des sessions</h1>
          <p className="text-sm text-muted">
            Toutes les sessions de caisse, ouvertes ou fermees, avec les ecarts de comptage.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select
          selectedKey={empId || "all"}
          onSelectionChange={(k) => { setEmpId(k === "all" ? "" : String(k)); setPage(1); }}
          aria-label="Emplacement"
          className="min-w-[200px]"
        >
          <Label className="text-xs text-muted">Emplacement</Label>
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
          className="min-w-[160px]"
        >
          <Label className="text-xs text-muted">Statut</Label>
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
      </div>

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
          <div className="space-y-2">
            {sessions.map((s) => <CarteSession key={s.id} session={s} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
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

function CarteSession({ session }: { session: ISessionCaisse }) {
  const ouverte = session.statut === "OPEN";
  const ecartCash = session.ecart?.CASH ?? 0;
  const aEcart = ecartCash !== 0;
  const dureeMinutes = session.fermeA
    ? Math.round((new Date(session.fermeA).getTime() - new Date(session.ouvertA).getTime()) / 60000)
    : Math.round((Date.now() - new Date(session.ouvertA).getTime()) / 60000);

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-mono text-sm font-semibold text-foreground">{session.numeroSession}</p>
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
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
            <span className="text-muted">
              Duree <span className="text-foreground font-medium tabular-nums">{formaterDuree(dureeMinutes)}</span>
            </span>
            <span className="text-muted">·</span>
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

function formaterDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
