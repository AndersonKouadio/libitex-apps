"use client";

import { useEffect, useState } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, Select, ListBox, TextArea, Switch,
} from "@heroui/react";
import {
  useCreerPromotionMutation, useModifierPromotionMutation,
} from "../queries/promotion.query";
import type { IPromotion, TypePromotion } from "../types/promotion.type";

interface Props {
  ouvert: boolean;
  promotion?: IPromotion | null;
  onFermer: () => void;
}

interface Etat {
  code: string;
  description: string;
  type: TypePromotion;
  valeur: string;
  montantMin: string;
  remiseMax: string;
  dateDebut: string;
  dateFin: string;
  limiteUtilisations: string;
  limiteParClient: string;
  actif: boolean;
}

const VIDE: Etat = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  valeur: "10",
  montantMin: "",
  remiseMax: "",
  dateDebut: "",
  dateFin: "",
  limiteUtilisations: "",
  limiteParClient: "",
  actif: true,
};

export function ModalPromotion({ ouvert, promotion, onFermer }: Props) {
  const creer = useCreerPromotionMutation();
  const modifier = useModifierPromotionMutation();
  const [etat, setEtat] = useState<Etat>(VIDE);

  useEffect(() => {
    if (!ouvert) return;
    if (promotion) {
      setEtat({
        code: promotion.code,
        description: promotion.description ?? "",
        type: promotion.type,
        valeur: String(promotion.valeur),
        montantMin: promotion.montantMin > 0 ? String(promotion.montantMin) : "",
        remiseMax: promotion.remiseMax != null ? String(promotion.remiseMax) : "",
        dateDebut: promotion.dateDebut ? promotion.dateDebut.slice(0, 10) : "",
        dateFin: promotion.dateFin ? promotion.dateFin.slice(0, 10) : "",
        limiteUtilisations: promotion.limiteUtilisations != null ? String(promotion.limiteUtilisations) : "",
        limiteParClient: promotion.limiteParClient != null ? String(promotion.limiteParClient) : "",
        actif: promotion.actif,
      });
    } else {
      setEtat(VIDE);
    }
  }, [ouvert, promotion]);

  function set<K extends keyof Etat>(k: K) {
    return (v: Etat[K]) => setEtat((e) => ({ ...e, [k]: v }));
  }

  async function valider() {
    const code = etat.code.trim().toUpperCase();
    if (!code) return;
    const valeur = Number(etat.valeur);
    if (!Number.isFinite(valeur) || valeur <= 0) return;

    const data = {
      code,
      description: etat.description || undefined,
      type: etat.type,
      valeur,
      montantMin: etat.montantMin ? Number(etat.montantMin) : undefined,
      remiseMax: etat.remiseMax ? Number(etat.remiseMax) : undefined,
      dateDebut: etat.dateDebut || undefined,
      dateFin: etat.dateFin || undefined,
      limiteUtilisations: etat.limiteUtilisations ? Number(etat.limiteUtilisations) : undefined,
      limiteParClient: etat.limiteParClient ? Number(etat.limiteParClient) : undefined,
    };

    if (promotion) {
      await modifier.mutateAsync({
        id: promotion.id,
        data: { ...data, actif: etat.actif },
      });
    } else {
      await creer.mutateAsync(data);
    }
    onFermer();
  }

  const enCours = creer.isPending || modifier.isPending;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{promotion ? "Modifier le code" : "Nouveau code promo"}</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={etat.code} onChange={set("code")} isRequired>
                <Label>Code</Label>
                <Input placeholder="RENTREE10" className="uppercase" />
                <FieldError />
              </TextField>
              <Select
                selectedKey={etat.type}
                onSelectionChange={(k) => set("type")(String(k) as TypePromotion)}
                aria-label="Type"
              >
                <Label>Type de remise</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="PERCENTAGE" textValue="Pourcentage">% Pourcentage</ListBox.Item>
                    <ListBox.Item id="FIXED_AMOUNT" textValue="Montant fixe">F Montant fixe</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={etat.valeur} onChange={set("valeur")} isRequired>
                <Label>{etat.type === "PERCENTAGE" ? "Pourcentage (%)" : "Montant (F CFA)"}</Label>
                <Input type="number" min="0" step="0.1" />
                <FieldError />
              </TextField>
              {etat.type === "PERCENTAGE" && (
                <TextField value={etat.remiseMax} onChange={set("remiseMax")}>
                  <Label>Plafond de remise (F)</Label>
                  <Input type="number" min="0" placeholder="Optionnel" />
                </TextField>
              )}
            </div>

            <TextField value={etat.montantMin} onChange={set("montantMin")}>
              <Label>Montant minimum du ticket (F)</Label>
              <Input type="number" min="0" placeholder="0 = pas de minimum" />
            </TextField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={etat.dateDebut} onChange={set("dateDebut")}>
                <Label>Date de debut</Label>
                <Input type="date" />
              </TextField>
              <TextField value={etat.dateFin} onChange={set("dateFin")}>
                <Label>Date de fin</Label>
                <Input type="date" />
              </TextField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={etat.limiteUtilisations} onChange={set("limiteUtilisations")}>
                <Label>Limite globale d&apos;utilisations</Label>
                <Input type="number" min="1" placeholder="Illimite" />
              </TextField>
              <TextField value={etat.limiteParClient} onChange={set("limiteParClient")}>
                <Label>Limite par client</Label>
                <Input type="number" min="1" placeholder="Illimite" />
              </TextField>
            </div>

            <TextField value={etat.description} onChange={set("description")}>
              <Label>Description (interne)</Label>
              <TextArea rows={2} placeholder="Pour vos archives admin..." />
            </TextField>

            {promotion && (
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium">Code actif</p>
                  <p className="text-xs text-muted">Desactivez pour le retirer temporairement sans le supprimer.</p>
                </div>
                <Switch isSelected={etat.actif} onChange={() => set("actif")(!etat.actif)} aria-label="Actif">
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                </Switch>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>Annuler</Button>
            <Button variant="primary" onPress={valider} isDisabled={enCours}>
              {enCours ? "..." : promotion ? "Enregistrer" : "Creer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
