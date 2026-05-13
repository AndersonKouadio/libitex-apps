"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextField,
  Label,
  Input,
  FieldError,
  TextArea,
  Select,
  ListBox,
} from "@heroui/react";
import { fraisSchema, type FraisDTO, DEVISES_FREQUENTES } from "../schemas/achat.schema";
import {
  useAjouterFraisMutation,
  useModifierFraisMutation,
} from "../queries/achat.query";
import type { IFrais } from "../types/achat.type";
import { LIBELLE_CATEGORIE, HINT_CATEGORIE } from "../utils/frais";

interface Props {
  ouvert: boolean;
  commandeId: string;
  frais?: IFrais | null;
  onFermer: () => void;
}

const CATEGORIES_FRAIS = [
  "TRANSPORT",
  "CUSTOMS",
  "TRANSIT",
  "INSURANCE",
  "HANDLING",
  "OTHER",
] as const;

/**
 * Phase A.2 — Modale d'ajout/edition d'un frais d'approche.
 *
 * Champs :
 * - Categorie (Select) : TRANSPORT / CUSTOMS / TRANSIT / INSURANCE / HANDLING / OTHER
 * - Libelle : nom du prestataire ou description courte
 * - Montant + Devise + Taux de change : permet la saisie en devise etrangere
 *   (EUR, USD, CNY...) avec conversion automatique en devise tenant
 * - Notes (optionnel)
 *
 * Le `montantEnBase` est calcule en preview et cote serveur.
 */
export function ModalFrais({ ouvert, commandeId, frais, onFermer }: Props) {
  const ajouter = useAjouterFraisMutation(commandeId);
  const modifier = useModifierFraisMutation(commandeId);

  const [etat, setEtat] = useState<FraisDTO>({
    categorie: "TRANSPORT",
    libelle: "",
    montant: 0,
    devise: "XOF",
    tauxChange: 1,
    notes: "",
  });
  const [erreur, setErreur] = useState<string>("");

  useEffect(() => {
    if (ouvert) {
      setEtat({
        categorie: frais?.categorie ?? "TRANSPORT",
        libelle: frais?.libelle ?? "",
        montant: frais?.montant ?? 0,
        devise: frais?.devise ?? "XOF",
        tauxChange: frais?.tauxChange ?? 1,
        notes: frais?.notes ?? "",
      });
      setErreur("");
    }
  }, [ouvert, frais]);

  async function valider() {
    const parsed = fraisSchema.safeParse({
      ...etat,
      notes: etat.notes || undefined,
    });
    if (!parsed.success) {
      setErreur(parsed.error.issues[0]?.message ?? "Donnees invalides");
      return;
    }
    if (frais) {
      await modifier.mutateAsync({ fraisId: frais.id, data: parsed.data });
    } else {
      await ajouter.mutateAsync(parsed.data);
    }
    onFermer();
  }

  const enCours = ajouter.isPending || modifier.isPending;
  const setStr = (k: keyof FraisDTO) => (v: string) =>
    setEtat((e) => ({ ...e, [k]: v }));
  const setNum = (k: keyof FraisDTO) => (v: string) => {
    const n = v === "" ? 0 : Number(v.replace(",", "."));
    setEtat((e) => ({ ...e, [k]: Number.isFinite(n) ? n : 0 }));
  };

  // Preview du montant converti en devise tenant.
  const montantEnBase = (etat.montant || 0) * (etat.tauxChange || 0);
  const memeDevise = etat.devise === "XOF" || etat.tauxChange === 1;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>
              {frais ? "Modifier le frais" : "Ajouter un frais d'approche"}
            </Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body className="space-y-3">
            {/* Categorie */}
            <Select
              selectedKey={etat.categorie}
              onSelectionChange={(k) =>
                setEtat((e) => ({ ...e, categorie: k as FraisDTO["categorie"] }))
              }
              aria-label="Categorie de frais"
            >
              <Label>Categorie</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {CATEGORIES_FRAIS.map((c) => (
                    <ListBox.Item key={c} id={c} textValue={LIBELLE_CATEGORIE[c]}>
                      <div className="flex flex-col">
                        <span>{LIBELLE_CATEGORIE[c]}</span>
                        <span className="text-xs text-muted">
                          {HINT_CATEGORIE[c]}
                        </span>
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Libelle */}
            <TextField value={etat.libelle} onChange={setStr("libelle")} isRequired>
              <Label>Libelle</Label>
              <Input placeholder="Transitaire Maersk - Conteneur 40HC" />
              <FieldError />
            </TextField>

            {/* Montant + Devise */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TextField
                  value={etat.montant ? String(etat.montant) : ""}
                  onChange={setNum("montant")}
                  isRequired
                >
                  <Label>Montant</Label>
                  <Input
                    placeholder="1500"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                  />
                </TextField>
              </div>
              <Select
                selectedKey={etat.devise}
                onSelectionChange={(k) =>
                  setEtat((e) => ({ ...e, devise: String(k) }))
                }
                aria-label="Devise"
              >
                <Label>Devise</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DEVISES_FREQUENTES.map((d) => (
                      <ListBox.Item key={d} id={d} textValue={d}>
                        {d}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Taux de change */}
            {!memeDevise && (
              <TextField
                value={etat.tauxChange ? String(etat.tauxChange) : ""}
                onChange={setNum("tauxChange")}
                isRequired
              >
                <Label>Taux de change (1 {etat.devise} = ? XOF)</Label>
                <Input
                  placeholder="655.957"
                  type="number"
                  inputMode="decimal"
                  step="0.000001"
                  min="0"
                />
              </TextField>
            )}

            {/* Preview montant en base */}
            {!memeDevise && etat.montant > 0 && etat.tauxChange > 0 && (
              <div className="bg-muted/5 border border-border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-xs">Montant en XOF</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(montantEnBase).toLocaleString("fr-FR")} F
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <TextField value={etat.notes ?? ""} onChange={setStr("notes")}>
              <Label>Notes</Label>
              <TextArea rows={2} placeholder="Numero BL, reference dossier..." />
            </TextField>

            {erreur && <p className="text-xs text-danger">{erreur}</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>
              Annuler
            </Button>
            <Button variant="primary" onPress={valider} isDisabled={enCours}>
              {enCours ? "Enregistrement..." : frais ? "Enregistrer" : "Ajouter"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
