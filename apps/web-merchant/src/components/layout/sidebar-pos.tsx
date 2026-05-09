"use client";

import { Avatar } from "@heroui/react";
import { PauseCircle, Receipt, BarChart3, Lock, History } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useKpisQuery } from "@/features/tableau-de-bord/queries/kpis.query";
import { useTicketListQuery } from "@/features/vente/queries/ticket-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useSessionActiveQuery } from "@/features/session-caisse/queries/session-active.query";
import { formatMontant, formatHeure, formatDateRelative } from "@/features/vente/utils/format";

interface Props {
  /** Si true, sidebar repliee : on cache les libelles. */
  replie: boolean;
}

// Communication sidebar -> page POS : la sidebar pousse ?attente=1 dans l'URL,
// la page reagit via useSearchParams. Plus simple et propre que de remonter
// un callback a travers le layout.

/**
 * Contenu de la sidebar quand l'utilisateur est en mode Caisse (/pos).
 * Affiche : caissier connecte, KPIs du jour, raccourcis tickets en attente
 * et derniere vente. Reste compacte pour ne pas voler d'espace au plan de
 * caisse principal.
 */
export function SidebarPOS({ replie }: Props) {
  const { utilisateur } = useAuth();
  const { data: kpis } = useKpisQuery();
  // Compteur 'tickets en cours' = parques + ouverts. Les deux sont des paniers
  // que le caissier peut reprendre depuis la modale.
  const { data: parkedData } = useTicketListQuery({ statut: "PARKED", page: 1 });
  const { data: openData } = useTicketListQuery({ statut: "OPEN", page: 1 });
  const nombreEnAttente =
    (parkedData?.data ?? []).filter((t) => t.statut === "PARKED").length +
    (openData?.data ?? []).filter((t) => t.statut === "OPEN").length;

  // Session active sur l'emplacement par defaut (premier STORE). Si le caissier
  // change d'emplacement dans le POS, ce bloc reflete la session du store
  // primaire — limitation acceptee pour V1, evite un store global d'emplacement.
  const { data: emplacements } = useEmplacementListQuery();
  const empParDefaut = (emplacements ?? []).find((e) => e.type === "STORE");
  const { data: sessionActive } = useSessionActiveQuery(empParDefaut?.id ?? null);

  if (replie) {
    return (
      <nav className="flex-1 px-2.5 py-3 space-y-1.5">
        <Link
          href={`/pos?attente=${Date.now()}`}
          className="relative w-full h-10 rounded-lg flex items-center justify-center text-white/65 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Tickets en attente"
        >
          <PauseCircle size={18} strokeWidth={1.5} />
          {nombreEnAttente > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-warning text-warning-foreground text-[10px] font-bold flex items-center justify-center">
              {nombreEnAttente}
            </span>
          )}
        </Link>
        <Link
          href="/rapports"
          className="w-full h-10 rounded-lg flex items-center justify-center text-white/65 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Rapports"
        >
          <BarChart3 size={18} strokeWidth={1.5} />
        </Link>
      </nav>
    );
  }

  const initiales = `${utilisateur?.prenom?.[0] ?? ""}${utilisateur?.nomFamille?.[0] ?? ""}`;

  return (
    <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
      {/* Caissier connecte + session */}
      <div className="flex items-center gap-2.5 px-1">
        <Avatar className="bg-accent text-accent-foreground text-xs font-semibold w-9 h-9">
          {initiales || "•"}
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white truncate">{utilisateur?.prenom} {utilisateur?.nomFamille}</p>
          {sessionActive ? (
            <p
              className="text-[10px] text-white/55 truncate"
              title={`Session ${sessionActive.numeroSession}`}
            >
              {formatDateRelative(sessionActive.ouvertA)} · depuis {formatHeure(sessionActive.ouvertA)}
            </p>
          ) : (
            <p className="text-[10px] text-warning/80 flex items-center gap-1">
              <Lock size={9} /> Caisse fermee
            </p>
          )}
        </div>
      </div>

      {/* KPIs jour */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-1 mb-1.5">
          Aujourd'hui
        </p>
        <div className="space-y-1">
          <KpiLigne libelle="Recettes" valeur={`${formatMontant(kpis?.recettesJour ?? 0)} F`} />
          <KpiLigne libelle="Tickets" valeur={String(kpis?.ticketsJour ?? 0)} />
          <KpiLigne libelle="Ticket moyen" valeur={`${formatMontant(kpis?.ticketMoyen ?? 0)} F`} />
        </div>
      </div>

      {/* Actions rapides */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-1 mb-1.5">
          Actions rapides
        </p>
        <div className="space-y-0.5">
          <Link
            href={`/pos?attente=${Date.now()}`}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/5 transition-colors"
          >
            <PauseCircle size={16} strokeWidth={1.5} />
            <span className="flex-1 text-left">Tickets en attente</span>
            {nombreEnAttente > 0 && (
              <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-[10px] font-bold flex items-center justify-center">
                {nombreEnAttente}
              </span>
            )}
          </Link>
          <Link
            href="/rapports"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Receipt size={16} strokeWidth={1.5} />
            Historique des ventes
          </Link>
          <Link
            href="/sessions-caisse"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/5 transition-colors"
          >
            <History size={16} strokeWidth={1.5} />
            Historique sessions
          </Link>
        </div>
      </div>
    </nav>
  );
}

function KpiLigne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-3 py-1 rounded-md hover:bg-white/5">
      <span className="text-[11px] text-white/55">{libelle}</span>
      <span className="text-sm font-semibold text-white tabular-nums">{valeur}</span>
    </div>
  );
}
