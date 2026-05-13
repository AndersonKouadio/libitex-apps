"use client";

import { Card, Chip } from "@heroui/react";
import { Calendar, Clock, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import type { IReservation, StatutReservation } from "../types/reservation.type";

interface Props {
  /** Reservations sur les 7 jours de la semaine (lundi -> dimanche). */
  reservations: IReservation[];
  /** Date de reference pour determiner le lundi de la semaine affichee. */
  dateReference: string;
  onSelect: (r: IReservation) => void;
}

const LIBELLE_STATUT: Record<StatutReservation, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmee",
  SEATED: "Installee",
  COMPLETED: "Terminee",
  CANCELLED: "Annulee",
  NO_SHOW: "No show",
};

const CLASSES_STATUT: Record<StatutReservation, string> = {
  PENDING: "bg-warning/10 text-warning",
  CONFIRMED: "bg-accent/10 text-accent",
  SEATED: "bg-success/10 text-success",
  COMPLETED: "bg-muted/10 text-muted",
  CANCELLED: "bg-danger/10 text-danger",
  NO_SHOW: "bg-danger/10 text-danger",
};

const JOURS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function lundiDeLaSemaine(dateISO: string): Date {
  const ref = new Date(`${dateISO}T12:00:00`);
  const decalLundi = (ref.getDay() + 6) % 7;
  const lundi = new Date(ref);
  lundi.setDate(ref.getDate() - decalLundi);
  lundi.setHours(0, 0, 0, 0);
  return lundi;
}

function formatHeure(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Module 12 D3 : vue calendrier hebdomadaire. 7 colonnes (lun-dim) avec
 * les reservations groupees par jour, triees par heure. Compacte pour
 * voir toute la semaine en un coup d'oeil. Mobile : scroll horizontal.
 */
export function VueSemaineReservations({ reservations, dateReference, onSelect }: Props) {
  const lundi = lundiDeLaSemaine(dateReference);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  // Groupe les reservations par jour (clé "YYYY-MM-DD").
  const groupes = new Map<string, IReservation[]>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    groupes.set(d.toISOString().slice(0, 10), []);
  }
  for (const r of reservations) {
    const cle = new Date(r.dateReservation).toISOString().slice(0, 10);
    if (groupes.has(cle)) groupes.get(cle)!.push(r);
  }
  // Tri par heure
  for (const lignes of groupes.values()) {
    lignes.sort((a, b) =>
      new Date(a.dateReservation).getTime() - new Date(b.dateReservation).getTime(),
    );
  }

  if (reservations.length === 0) {
    return (
      <EmptyState
        icone={Calendar}
        titre="Aucune reservation cette semaine"
        description="Naviguez sur une autre semaine ou creez une reservation."
      />
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <div className="grid grid-cols-7 gap-2 min-w-[840px]">
        {Array.from(groupes.entries()).map(([cleJour, lignes], i) => {
          const dateJour = new Date(`${cleJour}T12:00:00`);
          const estAujourdhui = dateJour.toDateString() === aujourdhui.toDateString();
          const numeroJour = dateJour.getDate();
          const totalCouverts = lignes.reduce((sum, r) => sum + r.nombrePersonnes, 0);
          return (
            <div key={cleJour} className="flex flex-col gap-2 min-w-0">
              <div className={`px-2 py-1.5 rounded-lg text-center text-xs ${
                estAujourdhui ? "bg-accent text-accent-foreground" : "bg-surface border border-border"
              }`}>
                <div className="font-semibold uppercase">{JOURS_FR[i]}</div>
                <div className="text-base font-bold tabular-nums">{numeroJour}</div>
                {lignes.length > 0 && (
                  <div className={`text-[10px] mt-0.5 ${estAujourdhui ? "opacity-90" : "text-muted"}`}>
                    {lignes.length} resa · {totalCouverts} couv.
                  </div>
                )}
              </div>

              <div className="space-y-1.5 min-h-[40px]">
                {lignes.map((r) => {
                  const dt = new Date(r.dateReservation);
                  return (
                    <Card
                      key={r.id}
                      className="cursor-pointer hover:border-accent/40 transition-colors"
                    >
                      <Card.Content className="p-2">
                        <button
                          type="button"
                          onClick={() => onSelect(r)}
                          className="block w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-xs font-bold flex items-center gap-1">
                              <Clock size={10} className="text-muted" />
                              {formatHeure(dt)}
                            </span>
                            <Chip className={`text-[9px] px-1.5 ${CLASSES_STATUT[r.statut]}`}>
                              {LIBELLE_STATUT[r.statut].slice(0, 3)}
                            </Chip>
                          </div>
                          <p className="text-xs font-medium truncate">{r.nomClient}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                            <span className="flex items-center gap-0.5">
                              <Users size={9} /> {r.nombrePersonnes}
                            </span>
                            {r.numeroTable && (
                              <span className="truncate">{r.numeroTable}</span>
                            )}
                          </div>
                        </button>
                      </Card.Content>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
