"use client";

import { useState, useEffect } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, TextArea,
} from "@heroui/react";
import { UserPlus, Pencil } from "lucide-react";
import { useCreerClientMutation, useModifierClientMutation } from "../queries/client.query";
import { creerClientSchema, type CreerClientDTO } from "../schemas/client.schema";
import type { IClient } from "../types/client.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Si fourni, modal en mode edition. Sinon mode creation. */
  client?: IClient | null;
}

const VIDE: CreerClientDTO = {
  prenom: "",
  nomFamille: "",
  telephone: "",
  email: "",
  adresse: "",
  notes: "",
};

export function ModalClient({ ouvert, onFermer, client }: Props) {
  const creer = useCreerClientMutation();
  const modifier = useModifierClientMutation();
  const [form, setForm] = useState<CreerClientDTO>(VIDE);
  const [erreur, setErreur] = useState("");

  const editing = !!client;

  useEffect(() => {
    if (client) {
      setForm({
        prenom: client.prenom,
        nomFamille: client.nomFamille ?? "",
        telephone: client.telephone ?? "",
        email: client.email ?? "",
        adresse: client.adresse ?? "",
        notes: client.notes ?? "",
      });
    } else {
      setForm(VIDE);
    }
    setErreur("");
  }, [client, ouvert]);

  function maj<K extends keyof CreerClientDTO>(champ: K, valeur: CreerClientDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  async function soumettre() {
    setErreur("");
    const validation = creerClientSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    const data = { ...validation.data };
    if (data.email === "") data.email = undefined;
    try {
      if (editing && client) {
        await modifier.mutateAsync({ id: client.id, data });
      } else {
        await creer.mutateAsync(data);
      }
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  const enCours = creer.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              {editing ? <Pencil className="size-5" /> : <UserPlus className="size-5" />}
            </Modal.Icon>
            <Modal.Heading>{editing ? "Modifier le client" : "Nouveau client"}</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField isRequired value={form.prenom} onChange={(v) => maj("prenom", v)}>
                <Label>Prénom</Label>
                <Input placeholder="Aminata" autoFocus />
                <FieldError />
              </TextField>
              <TextField value={form.nomFamille ?? ""} onChange={(v) => maj("nomFamille", v)}>
                <Label>Nom de famille</Label>
                <Input placeholder="Diallo" />
                <FieldError />
              </TextField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={form.telephone ?? ""} onChange={(v) => maj("telephone", v)}>
                <Label>Téléphone</Label>
                <Input placeholder="+221 77 000 12 34" type="tel" />
                <FieldError />
              </TextField>
              <TextField type="email" value={form.email ?? ""} onChange={(v) => maj("email", v)}>
                <Label>Email</Label>
                <Input placeholder="aminata@example.com" />
                <FieldError />
              </TextField>
            </div>

            <TextField value={form.adresse ?? ""} onChange={(v) => maj("adresse", v)}>
              <Label>Adresse</Label>
              <Input placeholder="Plateau, Dakar" />
              <FieldError />
            </TextField>

            <TextField value={form.notes ?? ""} onChange={(v) => maj("notes", v)}>
              <Label>Notes</Label>
              <TextArea placeholder="Cliente fidèle, préfère Mobile Money..." rows={3} />
              <FieldError />
            </TextField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={enCours}>
              {enCours
                ? "Enregistrement..."
                : editing ? "Enregistrer" : "Ajouter le client"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
