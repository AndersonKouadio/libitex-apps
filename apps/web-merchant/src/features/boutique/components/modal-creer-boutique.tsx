"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input } from "@heroui/react";
import { Store } from "lucide-react";
import { creerBoutiqueSchema, type CreerBoutiqueDTO } from "@/features/auth/schemas/auth.schema";
import { ChampSecteur } from "@/features/auth/components/champ-secteur";
import { slugifier } from "@/features/auth/utils/slug";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { useAjouterBoutiqueMutation } from "../queries/boutique-add.mutation";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

const VIDE: CreerBoutiqueDTO = {
  nomBoutique: "",
  slugBoutique: "",
  devise: "XOF",
  secteurActivite: "AUTRE",
};

export function ModalCreerBoutique({ ouvert, onFermer }: Props) {
  const mutation = useAjouterBoutiqueMutation();
  const [form, setForm] = useState<CreerBoutiqueDTO>(VIDE);
  const [erreur, setErreur] = useState("");

  function reinitialiser() {
    setForm(VIDE);
    setErreur("");
  }

  function setNom(v: string) {
    setForm((p) => ({ ...p, nomBoutique: v, slugBoutique: slugifier(v) }));
  }

  async function soumettre() {
    setErreur("");
    const validation = creerBoutiqueSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync(validation.data);
      reinitialiser();
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Store className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Nouvelle boutique</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <TextField isRequired name="nomBoutique" value={form.nomBoutique} onChange={setNom}>
              <Label>Nom de la boutique</Label>
              <Input placeholder="Ma boutique alimentaire" />
            </TextField>

            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-muted">libitex.com/</span>
              <span className="text-xs font-mono text-foreground">{form.slugBoutique || "..."}</span>
            </div>

            <ChampSecteur
              isRequired
              valeur={form.secteurActivite as SecteurActivite}
              onChange={(s) => setForm((p) => ({ ...p, secteurActivite: s }))}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Création..." : "Créer la boutique"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
