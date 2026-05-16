"use client";

import { useState } from "react";
import { Tabs, Card, Skeleton, Button } from "@heroui/react";
import {
  BookOpen, Calculator, FileText, ChevronDown, ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-states/empty-state";
import { ChampDate } from "@/components/forms/champ-date";
import {
  useJournalQuery, useBalanceQuery, usePlanComptableQuery,
} from "@/features/comptabilite/queries/comptabilite.query";
import { formatMontant } from "@/features/vente/utils/format";
import type { TypeCompte, IEcritureComptable } from "@/features/comptabilite/types/comptabilite.type";

type Onglet = "journal" | "balance" | "plan";

function aujourdhui(): string {
  return new Date().toISOString().split("T")[0]!;
}
function debutMois(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0]!;
}

const COULEUR_TYPE: Record<TypeCompte, string> = {
  ACTIF: "bg-accent/10 text-accent",
  PASSIF: "bg-warning/10 text-warning",
  CHARGE: "bg-danger/10 text-danger",
  PRODUIT: "bg-success/10 text-success",
};

const LIBELLE_TYPE: Record<TypeCompte, string> = {
  ACTIF: "Actif",
  PASSIF: "Passif",
  CHARGE: "Charge",
  PRODUIT: "Produit",
};

export default function PageComptabilite() {
  const [onglet, setOnglet] = useState<Onglet>("journal");
  const [debut, setDebut] = useState(debutMois());
  const [fin, setFin] = useState(aujourdhui());

  return (
    <PageContainer>
      <PageHeader
        titre="Comptabilité"
        description="Plan comptable OHADA, journal des écritures et balance des comptes. Les écritures de vente sont générées automatiquement à chaque ticket complété."
      />

      <Tabs selectedKey={onglet} onSelectionChange={(k) => setOnglet(k as Onglet)} aria-label="Comptabilite">
        <Tabs.List>
          <Tabs.Tab id="journal" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={14} />
              Journal
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="balance" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <Calculator size={14} />
              Balance
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="plan" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={14} />
              Plan comptable
            </span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Plage de dates (utilisee par Journal + Balance) */}
      {(onglet === "journal" || onglet === "balance") && (
        <div className="mt-4 mb-2 flex flex-wrap items-end gap-3">
          <ChampDate label="Du" value={debut} onChange={setDebut} />
          <ChampDate label="Au" value={fin} onChange={setFin} />
        </div>
      )}

      {onglet === "journal" && <SectionJournal debut={debut} fin={fin} />}
      {onglet === "balance" && <SectionBalance debut={debut} fin={fin} />}
      {onglet === "plan" && <SectionPlan />}
    </PageContainer>
  );
}

// ─── Section Journal ────────────────────────────────────────────────

function SectionJournal({ debut, fin }: { debut: string; fin: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useJournalQuery({ page, dateDebut: debut, dateFin: fin });

  const ecritures = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (ecritures.length === 0) {
    return (
      <EmptyState
        icone={BookOpen}
        titre="Aucune écriture sur cette période"
        description="Les écritures de vente sont créées automatiquement à chaque ticket complété. Élargis la période ou complète un ticket au POS."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted tabular-nums">
        {total} écriture{total > 1 ? "s" : ""}{totalPages > 1 && ` · page ${page} / ${totalPages}`}
      </p>
      {ecritures.map((e) => <CarteEcriture key={e.id} ecriture={e} />)}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
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

function CarteEcriture({ ecriture }: { ecriture: IEcritureComptable }) {
  const [ouvert, setOuvert] = useState(false);
  const dateFmt = new Date(ecriture.date + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <Card>
      <Card.Content className="p-0">
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/5 transition-colors"
        >
          {ouvert ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted">{ecriture.pieceNumber}</span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">{dateFmt}</span>
              {ecriture.referenceType && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/10 text-muted">
                  {ecriture.referenceType}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground truncate">{ecriture.description}</p>
          </div>
          <span className="text-sm font-semibold tabular-nums shrink-0">
            {formatMontant(ecriture.totalDebit)} F
          </span>
        </button>

        {ouvert && (
          <div className="border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase tracking-wider bg-muted/5">
                  <th className="px-3 py-1.5 text-left font-medium">Compte</th>
                  <th className="px-3 py-1.5 text-left font-medium">Libellé</th>
                  <th className="px-3 py-1.5 text-right font-medium">Débit</th>
                  <th className="px-3 py-1.5 text-right font-medium">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ecriture.lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono text-xs text-foreground">{l.accountCode}</td>
                    <td className="px-3 py-1.5 text-muted">
                      {l.accountLabel}
                      {l.description && <span className="text-xs ml-1 opacity-70">— {l.description}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {l.debit > 0 ? formatMontant(l.debit) : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {l.credit > 0 ? formatMontant(l.credit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/5">
                <tr className="font-semibold">
                  <td colSpan={2} className="px-3 py-1.5 text-right text-xs uppercase text-muted">Total</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatMontant(ecriture.totalDebit)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatMontant(ecriture.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ─── Section Balance ────────────────────────────────────────────────

function SectionBalance({ debut, fin }: { debut: string; fin: string }) {
  const { data, isLoading } = useBalanceQuery({ dateDebut: debut, dateFin: fin });

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const lignes = (data ?? []).filter((l) => l.totalDebit > 0 || l.totalCredit > 0);

  if (lignes.length === 0) {
    return (
      <EmptyState
        icone={Calculator}
        titre="Aucun mouvement sur cette période"
        description="La balance affiche les comptes qui ont eu au moins une écriture sur la période sélectionnée."
      />
    );
  }

  // Totaux globaux
  const totalDebit = lignes.reduce((s, l) => s + l.totalDebit, 0);
  const totalCredit = lignes.reduce((s, l) => s + l.totalCredit, 0);
  const ecart = Math.abs(totalDebit - totalCredit);

  return (
    <Card>
      <Card.Content className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/5 text-xs text-muted uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Code</th>
                <th className="px-4 py-2.5 text-left font-medium">Compte</th>
                <th className="px-4 py-2.5 text-center font-medium">Type</th>
                <th className="px-4 py-2.5 text-right font-medium">Débit</th>
                <th className="px-4 py-2.5 text-right font-medium">Crédit</th>
                <th className="px-4 py-2.5 text-right font-medium">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lignes.map((l) => (
                <tr key={l.code} className="hover:bg-muted/5">
                  <td className="px-4 py-2 font-mono text-xs">{l.code}</td>
                  <td className="px-4 py-2">{l.label}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${COULEUR_TYPE[l.type]}`}>
                      {LIBELLE_TYPE[l.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.totalDebit > 0 ? formatMontant(l.totalDebit) : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.totalCredit > 0 ? formatMontant(l.totalCredit) : ""}</td>
                  <td className={`px-4 py-2 text-right font-semibold tabular-nums ${
                    l.solde > 0 ? "text-accent" : l.solde < 0 ? "text-danger" : ""
                  }`}>
                    {l.solde !== 0 ? `${l.solde > 0 ? "" : "-"}${formatMontant(Math.abs(l.solde))}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/5 border-t border-border">
              <tr className="font-semibold">
                <td colSpan={3} className="px-4 py-2.5 text-right text-xs uppercase text-muted">Totaux</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMontant(totalDebit)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMontant(totalCredit)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${ecart > 0.5 ? "text-danger" : "text-success"}`}>
                  {ecart < 0.5 ? "Équilibré" : `Écart ${formatMontant(ecart)}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card.Content>
    </Card>
  );
}

// ─── Section Plan comptable ──────────────────────────────────────────

function SectionPlan() {
  const { data, isLoading } = usePlanComptableQuery();

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }
  const comptes = data ?? [];

  return (
    <div className="mt-4">
      <p className="text-xs text-muted mb-2">
        Plan comptable OHADA simplifié — {comptes.length} comptes seedés à l'inscription de votre boutique.
      </p>
      <Card>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/5 text-xs text-muted uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Code</th>
                <th className="px-4 py-2.5 text-left font-medium">Libellé</th>
                <th className="px-4 py-2.5 text-center font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comptes.map((c) => (
                <tr key={c.id} className="hover:bg-muted/5">
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{c.code}</td>
                  <td className="px-4 py-2 text-foreground">{c.label}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${COULEUR_TYPE[c.type]}`}>
                      {LIBELLE_TYPE[c.type]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}
