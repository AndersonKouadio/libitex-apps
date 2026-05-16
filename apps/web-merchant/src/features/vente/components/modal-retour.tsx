"use client";

import { useState } from "react";
import { Modal, Button, Select, ListBox, Label } from "@heroui/react";
import { RotateCcw, Minus, Plus } from "lucide-react";
import type { ITicket } from "../types/vente.type";
import { formatMontant } from "../utils/format";
import { useRetournerTicketMutation } from "../queries/ticket-retourner.mutation";

const METHODES_REMBOURSEMENT = [
  { id: "CASH", label: "Espèces" },
  { id: "MOBILE_MONEY", label: "Mobile Money" },
  { id: "CARD", label: "Carte bancaire" },
  { id: "BANK_TRANSFER", label: "Virement" },
  { id: "CREDIT", label: "Avoir client" },
];

interface LigneRetour {
  ligneId: string;
  quantiteMax: number;
  quantite: number;
  selectionne: boolean;
  nomProduit: string;
  nomVariante: string | null;
  prixUnitaire: number;
}

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  ticket: ITicket;
}

export function ModalRetour({ ouvert, onFermer, ticket }: Props) {
  const mutation = useRetournerTicketMutation();

  const [lignes, setLignes] = useState<LigneRetour[]>(() =>
    ticket.lignes.map((l) => ({
      ligneId: l.id,
      quantiteMax: l.quantite,
      quantite: l.quantite,
      selectionne: false,
      nomProduit: l.nomProduit,
      nomVariante: l.nomVariante ?? null,
      prixUnitaire: l.prixUnitaire,
    })),
  );

  const [methode, setMethode] = useState<string>("CASH");
  const [motif, setMotif] = useState("");
  const [reference, setReference] = useState("");

  const lignesSelectionnees = lignes.filter((l) => l.selectionne);
  const montantTotal = lignesSelectionnees.reduce(
    (acc, l) => acc + l.prixUnitaire * l.quantite, 0,
  );

  function fermer() {
    onFermer();
  }

  function toggleLigne(ligneId: string) {
    setLignes((prev) =>
      prev.map((l) => (l.ligneId === ligneId ? { ...l, selectionne: !l.selectionne } : l)),
    );
  }

  function changerQuantite(ligneId: string, delta: number) {
    setLignes((prev) =>
      prev.map((l) => {
        if (l.ligneId !== ligneId) return l;
        const next = Math.min(l.quantiteMax, Math.max(1, l.quantite + delta));
        return { ...l, quantite: next };
      }),
    );
  }

  async function soumettre() {
    if (lignesSelectionnees.length === 0) return;
    await mutation.mutateAsync({
      ticketId: ticket.id,
      payload: {
        lignes: lignesSelectionnees.map((l) => ({ ligneId: l.ligneId, quantite: l.quantite })),
        methodeRemboursement: methode,
        motif: motif || undefined,
        reference: reference || undefined,
      },
    });
    fermer();
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) fermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/10 text-warning">
              <RotateCcw className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Retour — {ticket.numeroTicket}</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-5">
            {/* Articles */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Articles à retourner</p>
              <div className="space-y-2">
                {lignes.map((l) => (
                  <div
                    key={l.ligneId}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                      l.selectionne
                        ? "border-accent bg-accent/5"
                        : "border-border bg-surface hover:bg-muted/10",
                    ].join(" ")}
                    onClick={() => toggleLigne(l.ligneId)}
                  >
                    <input
                      type="checkbox"
                      checked={l.selectionne}
                      readOnly
                      className="h-4 w-4 cursor-pointer rounded accent-[oklch(var(--accent))]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{l.nomProduit}</p>
                      {l.nomVariante && (
                        <p className="text-xs text-muted">{l.nomVariante}</p>
                      )}
                    </div>
                    <span className="tabular-nums text-xs text-muted">
                      {formatMontant(l.prixUnitaire)} F
                    </span>
                    {l.selectionne && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => changerQuantite(l.ligneId, -1)}
                          disabled={l.quantite <= 1}
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted hover:text-foreground disabled:opacity-30"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums font-medium">
                          {l.quantite}
                        </span>
                        <button
                          onClick={() => changerQuantite(l.ligneId, 1)}
                          disabled={l.quantite >= l.quantiteMax}
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted hover:text-foreground disabled:opacity-30"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Méthode de remboursement */}
            <Select
              selectedKey={methode}
              onSelectionChange={(k) => setMethode(String(k))}
              aria-label="Méthode de remboursement"
            >
              <Label>Méthode de remboursement</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {METHODES_REMBOURSEMENT.map((m) => (
                    <ListBox.Item key={m.id} id={m.id} textValue={m.label}>
                      {m.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Référence (optionnel) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Référence <span className="font-normal text-muted">(optionnel)</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° transaction MM, REF-..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {/* Motif (optionnel) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Motif <span className="font-normal text-muted">(optionnel)</span>
              </label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Produit défectueux, erreur de saisie..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {/* Récap */}
            {lignesSelectionnees.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                <span className="text-sm text-muted">
                  {lignesSelectionnees.length} article{lignesSelectionnees.length > 1 ? "s" : ""}
                </span>
                <span className="tabular-nums text-sm font-semibold text-foreground">
                  Remboursement : {formatMontant(montantTotal)} F
                </span>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={fermer}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onPress={soumettre}
              isDisabled={lignesSelectionnees.length === 0 || mutation.isPending}
            >
              {mutation.isPending ? "Traitement..." : "Valider le retour"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
