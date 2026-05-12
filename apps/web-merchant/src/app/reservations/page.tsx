"use client";

import { useState, useMemo } from "react";
import { Button, Card, Chip, Skeleton, Select, ListBox, Label } from "@heroui/react";
import {
  Plus, Calendar, Users, Phone, MapPin, Clock, Pencil, Trash2, Check, X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  useReservationsQuery, useResumeJourQuery,
  useModifierReservationMutation, useSupprimerReservationMutation,
} from "@/features/reservation/queries/reservation.query";
import { ModalReservation } from "@/features/reservation/components/modal-reservation";
import { useConfirmation } from "@/providers/confirmation-provider";
import type { IReservation, StatutReservation } from "@/features/reservation/types/reservation.type";

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

export default function PageReservations() {
  const [dateFiltre, setDateFiltre] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [statutFiltre, setStatutFiltre] = useState<string>("");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<IReservation | null>(null);

  const filtres = useMemo(() => {
    const debut = new Date(`${dateFiltre}T00:00:00`).toISOString();
    const fin = new Date(`${dateFiltre}T23:59:59`).toISOString();
    return {
      dateDebut: debut,
      dateFin: fin,
      statut: statutFiltre || undefined,
    };
  }, [dateFiltre, statutFiltre]);

  const { data: reservations, isLoading } = useReservationsQuery(filtres);
  const { data: resume } = useResumeJourQuery(dateFiltre);
  const modifier = useModifierReservationMutation();
  const supprimer = useSupprimerReservationMutation();
  const confirmer = useConfirmation();

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }
  function ouvrirEdition(r: IReservation) {
    setEnEdition(r);
    setModalOuvert(true);
  }
  async function handleSupprimer(r: IReservation) {
    const ok = await confirmer({
      titre: "Supprimer cette reservation ?",
      description: `« ${r.nomClient} » sera retire definitivement de la liste.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(r.id);
  }
  function changerStatut(r: IReservation, nouveau: StatutReservation) {
    modifier.mutate({ id: r.id, data: { statut: nouveau } });
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Reservations"
        description="Suivi des reservations de table, statuts et historique."
        actions={
          <Button variant="primary" className="gap-2" onPress={ouvrirCreation}>
            <Plus size={16} /> Nouvelle reservation
          </Button>
        }
      />

      {/* Résumé du jour */}
      {resume && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Card><Card.Content className="p-3">
            <p className="text-xs text-muted">Reservations</p>
            <p className="text-2xl font-bold tabular-nums">{resume.totalReservations}</p>
          </Card.Content></Card>
          <Card><Card.Content className="p-3">
            <p className="text-xs text-muted">Couverts</p>
            <p className="text-2xl font-bold tabular-nums">{resume.totalCouverts}</p>
          </Card.Content></Card>
          <Card><Card.Content className="p-3">
            <p className="text-xs text-muted">Confirmees</p>
            <p className="text-2xl font-bold tabular-nums text-accent">
              {(resume.parStatut.CONFIRMED?.nombre ?? 0) + (resume.parStatut.SEATED?.nombre ?? 0)}
            </p>
          </Card.Content></Card>
          <Card><Card.Content className="p-3">
            <p className="text-xs text-muted">En attente</p>
            <p className="text-2xl font-bold tabular-nums text-warning">
              {resume.parStatut.PENDING?.nombre ?? 0}
            </p>
          </Card.Content></Card>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-muted mb-1">Date</label>
          <input
            type="date"
            value={dateFiltre}
            onChange={(e) => setDateFiltre(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <Select
          selectedKey={statutFiltre || "all"}
          onSelectionChange={(k) => setStatutFiltre(k === "all" ? "" : String(k))}
          aria-label="Statut"
          className="min-w-[180px]"
        >
          <Label>Statut</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="Tous">Tous</ListBox.Item>
              <ListBox.Item id="PENDING" textValue="En attente">En attente</ListBox.Item>
              <ListBox.Item id="CONFIRMED" textValue="Confirmee">Confirmee</ListBox.Item>
              <ListBox.Item id="SEATED" textValue="Installee">Installee</ListBox.Item>
              <ListBox.Item id="COMPLETED" textValue="Terminee">Terminee</ListBox.Item>
              <ListBox.Item id="CANCELLED" textValue="Annulee">Annulee</ListBox.Item>
              <ListBox.Item id="NO_SHOW" textValue="No show">No show</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}
        </div>
      ) : (reservations?.length ?? 0) === 0 ? (
        <EmptyState
          icone={Calendar}
          titre="Aucune reservation ce jour-la"
          description="Cliquez sur « Nouvelle reservation » pour en ajouter une."
        />
      ) : (
        <div className="space-y-2">
          {(reservations ?? []).map((r) => {
            const date = new Date(r.dateReservation);
            const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            return (
              <Card key={r.id} className="hover:border-accent/30 transition-colors">
                <Card.Content className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-[260px]">
                      <span className="w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Clock size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-bold text-foreground">{heure}</p>
                        <p className="text-sm font-medium">{r.nomClient}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Users size={11} /> {r.nombrePersonnes} couverts
                          </span>
                          {r.numeroTable && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} /> {r.numeroTable}
                            </span>
                          )}
                          {r.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {r.telephone}
                            </span>
                          )}
                        </div>
                        {r.notes && (
                          <p className="text-xs text-muted mt-1 italic line-clamp-1">« {r.notes} »</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Chip className={`text-[10px] ${CLASSES_STATUT[r.statut]}`}>
                        {LIBELLE_STATUT[r.statut]}
                      </Chip>
                      {r.statut === "PENDING" && (
                        <Button
                          variant="ghost"
                          className="h-8 px-2 text-xs gap-1 text-accent"
                          onPress={() => changerStatut(r, "CONFIRMED")}
                        >
                          <Check size={12} /> Confirmer
                        </Button>
                      )}
                      {r.statut === "CONFIRMED" && (
                        <Button
                          variant="ghost"
                          className="h-8 px-2 text-xs gap-1 text-success"
                          onPress={() => changerStatut(r, "SEATED")}
                        >
                          <Users size={12} /> Installer
                        </Button>
                      )}
                      {r.statut === "SEATED" && (
                        <Button
                          variant="ghost"
                          className="h-8 px-2 text-xs gap-1 text-muted"
                          onPress={() => changerStatut(r, "COMPLETED")}
                        >
                          <Check size={12} /> Terminer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 min-w-0"
                        aria-label="Modifier"
                        onPress={() => ouvrirEdition(r)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 min-w-0 text-danger"
                        aria-label="Supprimer"
                        onPress={() => handleSupprimer(r)}
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

      <ModalReservation
        ouvert={modalOuvert}
        reservation={enEdition}
        onFermer={() => setModalOuvert(false)}
      />
    </PageContainer>
  );
}
