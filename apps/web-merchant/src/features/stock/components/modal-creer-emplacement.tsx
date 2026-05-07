"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, Select, ListBox } from "@heroui/react";
import { MapPin } from "lucide-react";
import { useAjouterEmplacementMutation } from "../queries/emplacement-add.mutation";

const TYPES = [
  { id: "STORE", label: "Boutique" },
  { id: "WAREHOUSE", label: "Entrepot" },
  { id: "QUARANTINE", label: "Quarantaine / Defectueux" },
];

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export function ModalCreerEmplacement({ ouvert, onFermer }: Props) {
  const mutation = useAjouterEmplacementMutation();
  const [nom, setNom] = useState("");
  const [type, setType] = useState("STORE");
  const [adresse, setAdresse] = useState("");
  const [erreur, setErreur] = useState("");

  function reinitialiser() {
    setNom(""); setType("STORE"); setAdresse(""); setErreur("");
  }

  async function soumettre() {
    if (!nom.trim()) { setErreur("Le nom est requis"); return; }
    setErreur("");
    try {
      await mutation.mutateAsync({ nom, type, adresse: adresse || undefined });
      reinitialiser();
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-success/10 text-success">
              <MapPin className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Nouvel emplacement</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>}
            <TextField isRequired name="nom" value={nom} onChange={setNom}>
              <Label>Nom</Label>
              <Input placeholder="Boutique Plateau" />
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
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Creation..." : "Creer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
