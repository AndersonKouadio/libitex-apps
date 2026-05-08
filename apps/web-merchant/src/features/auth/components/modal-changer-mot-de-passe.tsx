"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, FieldError, toast } from "@heroui/react";
import { KeyRound, AlertCircle, ShieldCheck } from "lucide-react";
import { useChangerMotDePasseMutation } from "../queries/changer-mot-de-passe.mutation";
import { changerMotDePasseSchema, type ChangerMotDePasseDTO } from "../schemas/auth.schema";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

const VIDE: ChangerMotDePasseDTO = {
  motDePasseActuel: "",
  nouveauMotDePasse: "",
  confirmation: "",
};

export function ModalChangerMotDePasse({ ouvert, onFermer }: Props) {
  const mutation = useChangerMotDePasseMutation();
  const [form, setForm] = useState<ChangerMotDePasseDTO>(VIDE);
  const [erreur, setErreur] = useState("");

  function maj<K extends keyof ChangerMotDePasseDTO>(champ: K, valeur: ChangerMotDePasseDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  function fermer() {
    setForm(VIDE);
    setErreur("");
    onFermer();
  }

  async function soumettre() {
    setErreur("");
    const validation = changerMotDePasseSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync({
        motDePasseActuel: validation.data.motDePasseActuel,
        nouveauMotDePasse: validation.data.nouveauMotDePasse,
      });
      toast.success("Mot de passe mis à jour");
      fermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) fermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <KeyRound className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Modifier le mot de passe</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <TextField
              isRequired
              type="password"
              value={form.motDePasseActuel}
              onChange={(v) => maj("motDePasseActuel", v)}
            >
              <Label>Mot de passe actuel</Label>
              <Input placeholder="••••••••" autoComplete="current-password" autoFocus />
              <FieldError />
            </TextField>

            <TextField
              isRequired
              type="password"
              value={form.nouveauMotDePasse}
              onChange={(v) => maj("nouveauMotDePasse", v)}
            >
              <Label>Nouveau mot de passe</Label>
              <Input placeholder="8 caractères minimum" autoComplete="new-password" />
              <FieldError />
            </TextField>

            <TextField
              isRequired
              type="password"
              value={form.confirmation}
              onChange={(v) => maj("confirmation", v)}
            >
              <Label>Confirmer le nouveau mot de passe</Label>
              <Input placeholder="Saisir à nouveau" autoComplete="new-password" />
              <FieldError />
            </TextField>

            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-accent/5 text-accent text-xs">
              <ShieldCheck size={14} className="shrink-0 mt-0.5" />
              <span>Choisissez un mot de passe unique, que vous n'utilisez nulle part ailleurs.</span>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Mettre à jour"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
