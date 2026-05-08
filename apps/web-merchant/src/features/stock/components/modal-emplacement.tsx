"use client";

import { useState, useEffect } from "react";
import { Modal, Button, TextField, Label, Input, Select, ListBox } from "@heroui/react";
import { MapPin, Pencil } from "lucide-react";
import { useAjouterEmplacementMutation } from "../queries/emplacement-add.mutation";
import { useModifierEmplacementMutation } from "../queries/emplacement.mutations";
import type { IEmplacement } from "../types/stock.type";

const TYPES = [
  { id: "STORE", label: "Boutique" },
  { id: "WAREHOUSE", label: "Entrepôt" },
  { id: "QUARANTINE", label: "Quarantaine / Défectueux" },
];

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Si fourni, modale en mode edition. */
  emplacement?: IEmplacement | null;
}

export function ModalEmplacement({ ouvert, onFermer, emplacement }: Props) {
  const ajouter = useAjouterEmplacementMutation();
  const modifier = useModifierEmplacementMutation();
  const [nom, setNom] = useState("");
  const [type, setType] = useState("STORE");
  const [adresse, setAdresse] = useState("");
  const [erreur, setErreur] = useState("");

  const editing = !!emplacement;

  useEffect(() => {
    if (emplacement) {
      setNom(emplacement.nom);
      setType(emplacement.type);
      setAdresse(emplacement.adresse ?? "");
    } else {
      setNom(""); setType("STORE"); setAdresse("");
    }
    setErreur("");
  }, [emplacement, ouvert]);

  async function soumettre() {
    if (!nom.trim()) { setErreur("Le nom est requis"); return; }
    setErreur("");
    try {
      if (editing && emplacement) {
        await modifier.mutateAsync({
          id: emplacement.id,
          data: { nom, type, adresse: adresse || undefined },
        });
      } else {
        await ajouter.mutateAsync({ nom, type, adresse: adresse || undefined });
      }
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  const enCours = ajouter.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-success/10 text-success">
              {editing ? <Pencil className="size-5" /> : <MapPin className="size-5" />}
            </Modal.Icon>
            <Modal.Heading>{editing ? "Modifier l'emplacement" : "Nouvel emplacement"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>}
            <TextField isRequired name="nom" value={nom} onChange={setNom}>
              <Label>Nom</Label>
              <Input placeholder="Boutique Plateau" autoFocus />
            </TextField>
            <Select name="type" selectedKey={type} onSelectionChange={(k) => setType(String(k))}>
              <Label>Type</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {TYPES.map((t) => <ListBox.Item key={t.id} id={t.id} textValue={t.label}>{t.label}</ListBox.Item>)}
                </ListBox>
              </Select.Popover>
            </Select>
            <TextField name="adresse" value={adresse} onChange={setAdresse}>
              <Label>Adresse (optionnel)</Label>
              <Input placeholder="Rue du Commerce, Dakar" />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={enCours}>
              {enCours ? "Enregistrement..." : editing ? "Enregistrer" : "Créer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
