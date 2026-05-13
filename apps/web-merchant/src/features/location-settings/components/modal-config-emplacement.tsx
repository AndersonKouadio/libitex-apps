"use client";

import { useEffect, useState } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, TextArea, Switch,
  Tabs, Checkbox, Skeleton,
} from "@heroui/react";
import { Settings, Percent, Wallet, Printer, FileText } from "lucide-react";
import {
  useLocationSettingsQuery, useModifierLocationSettingsMutation,
} from "../queries/location-settings.query";
import type { MethodePaiement } from "../types/location-settings.type";

interface Props {
  ouvert: boolean;
  /** Emplacement a configurer (id + nom pour le titre). */
  emplacement: { id: string; nom: string } | null;
  onFermer: () => void;
}

const METHODES_LABEL: Record<MethodePaiement, string> = {
  CASH: "Especes",
  CARD: "Carte bancaire",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  CREDIT: "Credit (a payer plus tard)",
};

const TOUTES_METHODES: MethodePaiement[] = [
  "CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT",
];

/**
 * Module 15 D3 : modale de configuration par emplacement. 4 onglets :
 * - Tarif : override TVA
 * - Paiements : override des methodes autorisees
 * - Tickets : footer personnalise + auto-print default
 * - Materiel : notes admin + signature imprimante preferee
 *
 * Approche "override" : chaque section a un switch "Heriter du tenant"
 * qui efface la valeur (envoi null backend). Sinon le champ est actif.
 */
export function ModalConfigEmplacement({ ouvert, emplacement, onFermer }: Props) {
  const { data: settings, isLoading } = useLocationSettingsQuery(
    ouvert && emplacement ? emplacement.id : null,
  );
  const mutation = useModifierLocationSettingsMutation(emplacement?.id ?? "");

  // ─── Etat local ──────────────────────────────────────────────────────
  const [tvaOverride, setTvaOverride] = useState<string>("");
  const [tvaActive, setTvaActive] = useState(false);
  const [methodesActive, setMethodesActive] = useState(false);
  const [methodes, setMethodes] = useState<MethodePaiement[]>(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"]);
  const [footerMessage, setFooterMessage] = useState("");
  const [autoPrint, setAutoPrint] = useState(false);
  const [signatureImprimante, setSignatureImprimante] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!settings) return;
    setTvaOverride(settings.taxRateOverride != null ? String(settings.taxRateOverride) : "");
    setTvaActive(settings.taxRateOverride != null);
    setMethodes(settings.paymentMethodsOverride ?? ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"]);
    setMethodesActive(settings.paymentMethodsOverride != null);
    setFooterMessage(settings.ticketFooterMessage ?? "");
    setAutoPrint(settings.autoPrintDefault);
    setSignatureImprimante(settings.preferredPrinterSignature ?? "");
    setNotes(settings.notes ?? "");
  }, [settings]);

  function toggleMethode(m: MethodePaiement) {
    setMethodes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  async function enregistrer() {
    if (!emplacement) return;
    const tva = tvaActive && tvaOverride !== "" ? Number(tvaOverride) : null;
    if (tva != null && (Number.isNaN(tva) || tva < 0 || tva > 100)) return;
    await mutation.mutateAsync({
      taxRateOverride: tva,
      paymentMethodsOverride: methodesActive ? methodes : null,
      ticketFooterMessage: footerMessage.trim() || null,
      autoPrintDefault: autoPrint,
      preferredPrinterSignature: signatureImprimante.trim() || null,
      notes: notes.trim() || null,
    });
    onFermer();
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Settings className="size-5" />
            </Modal.Icon>
            <Modal.Heading>
              Configuration — {emplacement?.nom}
            </Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : (
              <Tabs aria-label="Sections de configuration">
                <Tabs.List className="mb-4">
                  <Tabs.Tab id="tarif" className="gap-1.5"><Percent size={12} /> Tarif</Tabs.Tab>
                  <Tabs.Tab id="paiements" className="gap-1.5"><Wallet size={12} /> Paiements</Tabs.Tab>
                  <Tabs.Tab id="tickets" className="gap-1.5"><FileText size={12} /> Tickets</Tabs.Tab>
                  <Tabs.Tab id="materiel" className="gap-1.5"><Printer size={12} /> Materiel</Tabs.Tab>
                </Tabs.List>

                {/* ── Tarif ─────────────────────────────────────────── */}
                <Tabs.Panel id="tarif" className="space-y-4">
                  <SwitchHeriter
                    libelle="TVA personnalisee pour cet emplacement"
                    description="Par defaut, l'emplacement utilise la TVA configuree dans le profil de la boutique."
                    actif={tvaActive}
                    onChange={setTvaActive}
                  />
                  {tvaActive && (
                    <TextField value={tvaOverride} onChange={setTvaOverride}>
                      <Label>Taux de TVA (%)</Label>
                      <Input type="number" min="0" max="100" step="0.1" placeholder="0" inputMode="decimal" />
                      <p className="text-xs text-muted mt-1">
                        Ex : 0 pour zone export-libre, 5.5 pour taux reduit, 18 pour standard.
                      </p>
                      <FieldError />
                    </TextField>
                  )}
                </Tabs.Panel>

                {/* ── Paiements ─────────────────────────────────────── */}
                <Tabs.Panel id="paiements" className="space-y-4">
                  <SwitchHeriter
                    libelle="Methodes de paiement personnalisees"
                    description="Par defaut, l'emplacement accepte toutes les methodes definies sur la boutique."
                    actif={methodesActive}
                    onChange={setMethodesActive}
                  />
                  {methodesActive && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted">Cochez les methodes acceptees ici :</p>
                      {TOUTES_METHODES.map((m) => (
                        <Checkbox
                          key={m}
                          isSelected={methodes.includes(m)}
                          onChange={() => toggleMethode(m)}
                        >
                          <Checkbox.Indicator />
                          <span className="text-sm">{METHODES_LABEL[m]}</span>
                        </Checkbox>
                      ))}
                    </div>
                  )}
                </Tabs.Panel>

                {/* ── Tickets ───────────────────────────────────────── */}
                <Tabs.Panel id="tickets" className="space-y-4">
                  <TextField value={footerMessage} onChange={setFooterMessage}>
                    <Label>Message bas de ticket (optionnel)</Label>
                    <TextArea
                      rows={3}
                      placeholder="Merci de votre visite ! Suivez-nous sur Instagram @maboutique"
                    />
                    <p className="text-xs text-muted mt-1">
                      Imprime sur tous les tickets de cet emplacement. Max 200 caracteres.
                    </p>
                  </TextField>

                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Impression automatique par defaut</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">
                        Suggestion pour les nouveaux caissiers. Le reglage est ensuite
                        memorise par poste.
                      </p>
                    </div>
                    <Switch
                      isSelected={autoPrint}
                      onChange={() => setAutoPrint((v) => !v)}
                      aria-label="Impression automatique par defaut"
                    >
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                    </Switch>
                  </div>
                </Tabs.Panel>

                {/* ── Materiel ──────────────────────────────────────── */}
                <Tabs.Panel id="materiel" className="space-y-4">
                  <TextField value={signatureImprimante} onChange={setSignatureImprimante}>
                    <Label>Signature imprimante preferee (optionnel)</Label>
                    <Input placeholder="ex : Epson TM-T20 ou MUNBYN ITPP047" />
                    <p className="text-xs text-muted mt-1">
                      Aide-memoire pour identifier l&apos;imprimante a appairer
                      depuis ce poste. Pas de configuration automatique.
                    </p>
                  </TextField>

                  <TextField value={notes} onChange={setNotes}>
                    <Label>Notes admin</Label>
                    <TextArea rows={3} placeholder="Ex : imprimante BT au comptoir 2, manager Mr. Diallo..." />
                  </TextField>
                </Tabs.Panel>
              </Tabs>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onFermer}>Annuler</Button>
            <Button variant="primary" onPress={enregistrer} isDisabled={mutation.isPending || isLoading}>
              {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

interface SwitchHeriterProps {
  libelle: string;
  description: string;
  actif: boolean;
  onChange: (v: boolean) => void;
}

function SwitchHeriter({ libelle, description, actif, onChange }: SwitchHeriterProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{libelle}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
        {!actif && (
          <p className="text-xs text-success mt-1">
            Hérite actuellement de la boutique
          </p>
        )}
      </div>
      <Switch
        isSelected={actif}
        onChange={() => onChange(!actif)}
        aria-label={libelle}
      >
        <Switch.Control><Switch.Thumb /></Switch.Control>
      </Switch>
    </div>
  );
}
