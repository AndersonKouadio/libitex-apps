"use client";

import { useEffect, useState } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, Select, ListBox, TextArea,
} from "@heroui/react";
import {
  useCreerReservationMutation, useModifierReservationMutation,
} from "../queries/reservation.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import type { IReservation, StatutReservation } from "../types/reservation.type";

interface Props {
  ouvert: boolean;
  reservation?: IReservation | null;
  onFermer: () => void;
}

interface Etat {
  emplacementId: string;
  nomClient: string;
  telephone: string;
  numeroTable: string;
  date: string;
  heure: string;
  nombrePersonnes: string;
  notes: string;
  statut: StatutReservation;
}

const VIDE: Etat = {
  emplacementId: "",
  nomClient: "",
  telephone: "",
  numeroTable: "",
  date: new Date().toISOString().slice(0, 10),
  heure: "19:00",
  nombrePersonnes: "2",
  notes: "",
  statut: "PENDING",
};

export function ModalReservation({ ouvert, reservation, onFermer }: Props) {
  const { data: emplacements } = useEmplacementListQuery();
  const creer = useCreerReservationMutation();
  const modifier = useModifierReservationMutation();
  const [etat, setEtat] = useState<Etat>(VIDE);

  useEffect(() => {
    if (!ouvert) return;
    if (reservation) {
      const d = new Date(reservation.dateReservation);
      setEtat({
        emplacementId: reservation.emplacementId,
        nomClient: reservation.nomClient,
        telephone: reservation.telephone ?? "",
        numeroTable: reservation.numeroTable ?? "",
        date: d.toISOString().slice(0, 10),
        heure: d.toTimeString().slice(0, 5),
        nombrePersonnes: String(reservation.nombrePersonnes),
        notes: reservation.notes ?? "",
        statut: reservation.statut,
      });
    } else {
      setEtat({ ...VIDE, emplacementId: emplacements?.[0]?.id ?? "" });
    }
  }, [ouvert, reservation, emplacements]);

  function set<K extends keyof Etat>(k: K) {
    return (v: Etat[K]) => setEtat((e) => ({ ...e, [k]: v }));
  }

  async function valider() {
    if (!etat.emplacementId || !etat.nomClient.trim() || !etat.date || !etat.heure) return;
    const dateISO = new Date(`${etat.date}T${etat.heure}:00`).toISOString();
    const nb = Number(etat.nombrePersonnes);
    if (!Number.isFinite(nb) || nb < 1) return;

    const base = {
      emplacementId: etat.emplacementId,
      nomClient: etat.nomClient.trim(),
      telephone: etat.telephone.trim() || undefined,
      numeroTable: etat.numeroTable.trim() || undefined,
      dateReservation: dateISO,
      nombrePersonnes: nb,
      notes: etat.notes.trim() || undefined,
    };

    if (reservation) {
      await modifier.mutateAsync({
        id: reservation.id,
        data: { ...base, statut: etat.statut },
      });
    } else {
      await creer.mutateAsync(base);
    }
    onFermer();
  }

  const enCours = creer.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{reservation ? "Modifier la reservation" : "Nouvelle reservation"}</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <Select
              selectedKey={etat.emplacementId || undefined}
              onSelectionChange={(k) => set("emplacementId")(String(k))}
              aria-label="Emplacement"
            >
              <Label>Emplacement</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(emplacements ?? []).map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={etat.nomClient} onChange={set("nomClient")} isRequired>
                <Label>Nom du client</Label>
                <Input placeholder="M. Kouame" />
                <FieldError />
              </TextField>
              <TextField value={etat.telephone} onChange={set("telephone")}>
                <Label>Telephone</Label>
                <Input placeholder="+225..." />
              </TextField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField value={etat.date} onChange={set("date")} isRequired>
                <Label>Date</Label>
                <Input type="date" />
              </TextField>
              <TextField value={etat.heure} onChange={set("heure")} isRequired>
                <Label>Heure</Label>
                <Input type="time" />
              </TextField>
              <TextField value={etat.nombrePersonnes} onChange={set("nombrePersonnes")} isRequired>
                <Label>Couverts</Label>
                <Input type="number" min="1" />
              </TextField>
            </div>

            <TextField value={etat.numeroTable} onChange={set("numeroTable")}>
              <Label>Table</Label>
              <Input placeholder="Table 4, Terrasse 2, Bar..." />
            </TextField>

            {reservation && (
              <Select
                selectedKey={etat.statut}
                onSelectionChange={(k) => set("statut")(String(k) as StatutReservation)}
                aria-label="Statut"
              >
                <Label>Statut</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="PENDING" textValue="En attente">En attente</ListBox.Item>
                    <ListBox.Item id="CONFIRMED" textValue="Confirmee">Confirmee</ListBox.Item>
                    <ListBox.Item id="SEATED" textValue="Installee">Installee</ListBox.Item>
                    <ListBox.Item id="COMPLETED" textValue="Terminee">Terminee</ListBox.Item>
                    <ListBox.Item id="CANCELLED" textValue="Annulee">Annulee</ListBox.Item>
                    <ListBox.Item id="NO_SHOW" textValue="No show">No show</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            )}

            <TextField value={etat.notes} onChange={set("notes")}>
              <Label>Notes</Label>
              <TextArea rows={2} placeholder="Allergies, occasion speciale, table preferee..." />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>Annuler</Button>
            <Button variant="primary" onPress={valider} isDisabled={enCours}>
              {enCours ? "..." : reservation ? "Enregistrer" : "Creer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
