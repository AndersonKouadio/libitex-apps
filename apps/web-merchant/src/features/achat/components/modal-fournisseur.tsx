"use client";

import { useEffect, useState } from "react";
import { Modal, Button, TextField, Label, Input, FieldError, TextArea } from "@heroui/react";
import { fournisseurSchema, type FournisseurDTO } from "../schemas/achat.schema";
import {
  useCreerFournisseurMutation, useModifierFournisseurMutation,
} from "../queries/achat.query";
import type { IFournisseur } from "../types/achat.type";

interface Props {
  ouvert: boolean;
  fournisseur?: IFournisseur | null;
  onFermer: () => void;
}

export function ModalFournisseur({ ouvert, fournisseur, onFermer }: Props) {
  const creer = useCreerFournisseurMutation();
  const modifier = useModifierFournisseurMutation();
  const [etat, setEtat] = useState<FournisseurDTO>({
    nom: "",
    nomContact: "",
    telephone: "",
    email: "",
    adresse: "",
    conditionsPaiement: "",
    notes: "",
  });
  const [erreur, setErreur] = useState<string>("");

  useEffect(() => {
    if (ouvert) {
      setEtat({
        nom: fournisseur?.nom ?? "",
        nomContact: fournisseur?.nomContact ?? "",
        telephone: fournisseur?.telephone ?? "",
        email: fournisseur?.email ?? "",
        adresse: fournisseur?.adresse ?? "",
        conditionsPaiement: fournisseur?.conditionsPaiement ?? "",
        notes: fournisseur?.notes ?? "",
      });
      setErreur("");
    }
  }, [ouvert, fournisseur]);

  async function valider() {
    const parsed = fournisseurSchema.safeParse({
      ...etat,
      email: etat.email || undefined,
    });
    if (!parsed.success) {
      setErreur(parsed.error.issues[0]?.message ?? "Donnees invalides");
      return;
    }
    const data: FournisseurDTO = parsed.data;
    if (fournisseur) {
      await modifier.mutateAsync({ id: fournisseur.id, data });
    } else {
      await creer.mutateAsync(data);
    }
    onFermer();
  }

  const enCours = creer.isPending || modifier.isPending;
  const set = (k: keyof FournisseurDTO) => (v: string) => setEtat((e) => ({ ...e, [k]: v }));

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <TextField value={etat.nom} onChange={set("nom")} isRequired>
              <Label>Nom de l&apos;entreprise</Label>
              <Input placeholder="Ets ABC SARL" autoCapitalize="words" />
              <FieldError />
            </TextField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={etat.nomContact ?? ""} onChange={set("nomContact")}>
                <Label>Nom du contact</Label>
                <Input placeholder="M. Kouame" autoComplete="name" autoCapitalize="words" />
              </TextField>
              <TextField value={etat.telephone ?? ""} onChange={set("telephone")}>
                <Label>Telephone</Label>
                <Input placeholder="+225 ..." type="tel" inputMode="tel" autoComplete="tel" />
              </TextField>
            </div>
            <TextField value={etat.email ?? ""} onChange={set("email")}>
              <Label>Email</Label>
              <Input placeholder="contact@fournisseur.ci" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" />
            </TextField>
            <TextField value={etat.adresse ?? ""} onChange={set("adresse")}>
              <Label>Adresse</Label>
              <TextArea rows={2} placeholder="Quartier, ville..." />
            </TextField>
            <TextField value={etat.conditionsPaiement ?? ""} onChange={set("conditionsPaiement")}>
              <Label>Conditions de paiement</Label>
              <Input placeholder="30 jours fin de mois" />
            </TextField>
            <TextField value={etat.notes ?? ""} onChange={set("notes")}>
              <Label>Notes</Label>
              <TextArea rows={2} placeholder="Informations utiles..." />
            </TextField>
            {erreur && <p className="text-xs text-danger">{erreur}</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>Annuler</Button>
            <Button variant="primary" onPress={valider} isDisabled={enCours}>
              {enCours ? "Enregistrement..." : fournisseur ? "Enregistrer" : "Creer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
