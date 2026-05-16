"use client";

import { useState, useMemo } from "react";
import { Select, ListBox, Button, Skeleton } from "@heroui/react";
import { Download, User, MapPin } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { ChampDate } from "@/components/forms/champ-date";
import { StatutChip, type VarianteStatut } from "@/components/statut-chip";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useJournalVentesQuery } from "../queries/journal-ventes.query";
import { formatMontant, formatDate, formatHeure } from "../utils/format";
import type { ILigneJournal } from "../types/vente.type";

const STATUT_CONFIG: Record<string, { variante: VarianteStatut; libelle: string }> = {
  COMPLETED: { variante: "active", libelle: "Réglé" },
  CANCELLED: { variante: "failed", libelle: "Annulé" },
  OPEN: { variante: "pending", libelle: "En cours" },
  PARKED: { variante: "draft", libelle: "En attente" },
};

function aujourdhui(): string {
  return new Date().toISOString().split("T")[0]!;
}

function ilYa(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return d.toISOString().split("T")[0]!;
}

function exporterJournalCsv(lignes: ILigneJournal[]) {
  const BOM = "﻿";
  const entete = "Ticket;Date;Heure;Emplacement;Client;Total (F);Remise (F);Statut";
  const rows = lignes.map((l) => [
    l.ticketNumber,
    l.completedAt ? formatDate(l.completedAt) : (l.createdAt ? formatDate(l.createdAt) : ""),
    l.completedAt ? formatHeure(l.completedAt) : (l.createdAt ? formatHeure(l.createdAt) : ""),
    l.nomEmplacement ?? "",
    l.nomClient ?? "",
    l.total,
    l.discountAmount,
    STATUT_CONFIG[l.status]?.libelle ?? l.status,
  ].join(";")).join("\n");
  const blob = new Blob([BOM + entete + "\n" + rows], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `journal-ventes-${aujourdhui()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 25;

export function JournalVentes() {
  const { data: emplacements } = useEmplacementListQuery();

  const [debut, setDebut] = useState(ilYa(7));
  const [fin, setFin] = useState(aujourdhui());
  const [empId, setEmpId] = useState("");
  const [statut, setStatut] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useJournalVentesQuery({
    page,
    dateDebut: debut,
    dateFin: fin,
    emplacementId: empId || undefined,
    statut: statut || undefined,
  });

  const lignes = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  // KPIs agreges sur la page courante (pas besoin de requete separee)
  const kpis = useMemo(() => {
    const completed = lignes.filter((l) => l.status === "COMPLETED");
    return {
      ca: completed.reduce((s, l) => s + l.total, 0),
      nbTickets: completed.length,
      nbAnnules: lignes.filter((l) => l.status === "CANCELLED").length,
    };
  }, [lignes]);

  function changerFiltre() {
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3">
        <ChampDate label="Du" value={debut} onChange={(v) => { setDebut(v); changerFiltre(); }} />
        <ChampDate label="Au" value={fin} onChange={(v) => { setFin(v); changerFiltre(); }} />
        <Select
          selectedKey={empId || "all"}
          onSelectionChange={(k) => { setEmpId(k === "all" ? "" : String(k)); changerFiltre(); }}
          aria-label="Emplacement"
          className="min-w-[180px]"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="Tous">Tous les emplacements</ListBox.Item>
              {(emplacements ?? []).map((e) => (
                <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select
          selectedKey={statut || "all"}
          onSelectionChange={(k) => { setStatut(k === "all" ? "" : String(k)); changerFiltre(); }}
          aria-label="Statut"
          className="min-w-[150px]"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="Tous">Tous les statuts</ListBox.Item>
              <ListBox.Item id="COMPLETED" textValue="Réglé">Réglé</ListBox.Item>
              <ListBox.Item id="CANCELLED" textValue="Annulé">Annulé</ListBox.Item>
              <ListBox.Item id="OPEN" textValue="En cours">En cours</ListBox.Item>
              <ListBox.Item id="PARKED" textValue="En attente">En attente</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        {lignes.length > 0 && (
          <Button
            variant="secondary"
            onPress={() => exporterJournalCsv(lignes)}
            className="gap-1.5"
          >
            <Download size={14} /> Export CSV
          </Button>
        )}
      </div>

      {/* KPIs résumé */}
      {!isLoading && total > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-muted px-1">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{total}</span> ticket{total > 1 ? "s" : ""} sur la période
          </span>
          <span>·</span>
          <span>
            CA réglé :{" "}
            <span className="font-semibold text-foreground tabular-nums">{formatMontant(kpis.ca)} F</span>
            {" "}({kpis.nbTickets} réglé{kpis.nbTickets > 1 ? "s" : ""})
          </span>
          {kpis.nbAnnules > 0 && (
            <>
              <span>·</span>
              <span className="text-danger">{kpis.nbAnnules} annulé{kpis.nbAnnules > 1 ? "s" : ""}</span>
            </>
          )}
          {totalPages > 1 && (
            <>
              <span>·</span>
              <span>page {page} / {totalPages}</span>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : lignes.length === 0 ? (
        <EmptyState
          icone={Download}
          titre="Aucun ticket sur cette période"
          description="Modifiez les filtres ou la plage de dates pour voir des résultats."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/5 text-xs text-muted uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">Ticket</th>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Emplacement</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Client</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-center font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lignes.map((l) => {
                  const cfg = STATUT_CONFIG[l.status] ?? { variante: "draft" as VarianteStatut, libelle: l.status };
                  const dateRef = l.completedAt ?? l.createdAt;
                  return (
                    <tr key={l.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                        {l.ticketNumber}
                      </td>
                      <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                        {dateRef ? (
                          <span>
                            {formatDate(dateRef)}{" "}
                            <span className="text-xs opacity-70">{formatHeure(dateRef)}</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {l.nomEmplacement ? (
                          <span className="flex items-center gap-1.5 text-muted">
                            <MapPin size={11} className="shrink-0" />
                            {l.nomEmplacement}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        {l.nomClient ? (
                          <span className="flex items-center gap-1.5 text-muted">
                            <User size={11} className="shrink-0" />
                            {l.nomClient}
                          </span>
                        ) : (
                          <span className="text-muted/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                        {formatMontant(l.total)} F
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatutChip variante={cfg.variante} className="text-[10px]">
                          {cfg.libelle}
                        </StatutChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
