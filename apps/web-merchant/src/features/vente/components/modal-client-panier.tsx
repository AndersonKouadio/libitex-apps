"use client";

import { useState } from "react";
import {
  Modal, Button, TextField, Label, Input, FieldError, Skeleton,
} from "@heroui/react";
import { User, Phone, UserPlus, Search } from "lucide-react";
import { useClientListQuery, useCreerClientMutation } from "@/features/client/queries/client.query";
import type { ClientPanier } from "../hooks/usePanier";

interface Props {
  ouvert: boolean;
  clientCourant?: ClientPanier | null;
  onConfirmer: (client: ClientPanier | null) => void;
  onFermer: () => void;
}

/**
 * Modale rapide de selection / creation client pour le POS.
 * - Recherche par telephone ou nom (debounced via Tanstack Query)
 * - Si rien trouve, propose de creer rapidement (juste prenom + telephone)
 * - Permet aussi une saisie 100% libre (nom + telephone) sans creer en base,
 *   pour les clients de passage qu'on ne veut pas enregistrer.
 */
export function ModalClientPanier({ ouvert, clientCourant, onConfirmer, onFermer }: Props) {
  const [recherche, setRecherche] = useState("");
  const [modeCreation, setModeCreation] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauTel, setNouveauTel] = useState("");
  const creer = useCreerClientMutation();

  const { data, isLoading } = useClientListQuery(1, recherche.length >= 2 ? recherche : undefined);
  const clients = data?.data ?? [];

  function selectionner(c: { id: string; prenom: string; nomFamille: string | null; telephone: string | null }) {
    onConfirmer({
      id: c.id,
      nom: [c.prenom, c.nomFamille].filter(Boolean).join(" "),
      telephone: c.telephone ?? undefined,
    });
    onFermer();
    reset();
  }

  function libre() {
    if (!nouveauNom.trim() && !nouveauTel.trim()) return;
    onConfirmer({
      nom: nouveauNom.trim() || undefined,
      telephone: nouveauTel.trim() || undefined,
    });
    onFermer();
    reset();
  }

  async function creerEtSelectionner() {
    if (!nouveauNom.trim()) return;
    const cree = await creer.mutateAsync({
      prenom: nouveauNom.trim(),
      telephone: nouveauTel.trim() || undefined,
    });
    onConfirmer({
      id: cree.id,
      nom: [cree.prenom, cree.nomFamille].filter(Boolean).join(" "),
      telephone: cree.telephone ?? undefined,
    });
    onFermer();
    reset();
  }

  function deselectionner() {
    onConfirmer(null);
    onFermer();
    reset();
  }

  function reset() {
    setRecherche("");
    setModeCreation(false);
    setNouveauNom("");
    setNouveauTel("");
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) { onFermer(); reset(); } }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <User className="size-5" />
            </Modal.Icon>
            <Modal.Heading>
              {modeCreation ? "Nouveau client" : "Associer un client"}
            </Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {!modeCreation ? (
              <>
                <TextField value={recherche} onChange={setRecherche}>
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Search size={12} /> Rechercher par nom ou téléphone
                  </Label>
                  <Input placeholder="Amadou ou +225 07..." autoFocus />
                  <FieldError />
                </TextField>

                {recherche.length >= 2 && (
                  <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-[280px] overflow-y-auto">
                    {isLoading ? (
                      <div className="p-2 space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 rounded" />
                        ))}
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted">
                        Aucun client trouvé pour "{recherche}"
                      </div>
                    ) : (
                      clients.slice(0, 10).map((c) => {
                        const nomComplet = [c.prenom, c.nomFamille].filter(Boolean).join(" ");
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectionner(c)}
                            className="w-full text-left p-2.5 hover:bg-muted/5 flex items-center gap-2"
                          >
                            <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center shrink-0">
                              {c.prenom[0]?.toUpperCase()}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{nomComplet}</p>
                              {c.telephone && (
                                <p className="text-[10px] text-muted truncate">{c.telephone}</p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onPress={() => { setNouveauNom(recherche); setModeCreation(true); }}
                >
                  <UserPlus size={14} /> Nouveau client
                </Button>
              </>
            ) : (
              <>
                <TextField value={nouveauNom} onChange={setNouveauNom} isRequired>
                  <Label>Nom</Label>
                  <Input placeholder="Amadou Diallo" autoFocus />
                  <FieldError />
                </TextField>

                <TextField value={nouveauTel} onChange={setNouveauTel}>
                  <Label className="flex items-center gap-1.5">
                    <Phone size={12} /> Téléphone (optionnel)
                  </Label>
                  <Input placeholder="+225 07 00 00 00" type="tel" />
                  <FieldError />
                </TextField>

                <p className="text-xs text-muted">
                  Si vous voulez juste noter le nom sans enregistrer le client, utilisez "Sans enregistrer".
                </p>
              </>
            )}
          </Modal.Body>

          <Modal.Footer className="flex-wrap gap-2">
            {clientCourant && !modeCreation && (
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger/5 mr-auto"
                onPress={deselectionner}
              >
                Retirer le client
              </Button>
            )}
            {modeCreation ? (
              <>
                <Button variant="ghost" className="mr-auto" onPress={() => setModeCreation(false)}>
                  ← Retour
                </Button>
                <Button
                  variant="secondary"
                  onPress={libre}
                  isDisabled={!nouveauNom.trim() && !nouveauTel.trim()}
                >
                  Sans enregistrer
                </Button>
                <Button
                  variant="primary"
                  onPress={creerEtSelectionner}
                  isDisabled={!nouveauNom.trim() || creer.isPending}
                >
                  {creer.isPending ? "Création..." : "Créer"}
                </Button>
              </>
            ) : (
              <Button variant="secondary" slot="close">Annuler</Button>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
