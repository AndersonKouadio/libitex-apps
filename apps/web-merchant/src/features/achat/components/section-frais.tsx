"use client";

import { useState } from "react";
import { Button, Chip, Skeleton } from "@heroui/react";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { formatMontant } from "@/features/vente/utils/format";
import {
  useFraisListQuery,
  useSupprimerFraisMutation,
} from "../queries/achat.query";
import type { IFrais } from "../types/achat.type";
import { LIBELLE_CATEGORIE, CLASSES_CATEGORIE } from "../utils/frais";
import { useConfirmation } from "@/providers/confirmation-provider";
import { ModalFrais } from "./modal-frais";

interface Props {
  commandeId: string;
  /** Permet de bloquer l'edition une fois la commande recue/annulee. */
  modifiable: boolean;
}

/**
 * Phase A.2 — Section des frais d'approche d'une commande.
 *
 * Affiche la liste, le total en devise tenant, et permet d'ajouter / modifier
 * / supprimer. Bloque les actions si la commande n'est plus modifiable
 * (statut RECEIVED ou CANCELLED).
 *
 * Layout : header avec total et bouton "Ajouter", liste en cartes,
 * empty state si vide.
 */
export function SectionFrais({ commandeId, modifiable }: Props) {
  const { data: frais, isLoading } = useFraisListQuery(commandeId);
  const supprimer = useSupprimerFraisMutation(commandeId);
  const confirmer = useConfirmation();

  const [modalOuverte, setModalOuverte] = useState(false);
  const [fraisEnEdition, setFraisEnEdition] = useState<IFrais | null>(null);

  const total = (frais ?? []).reduce((s, f) => s + (f.montantEnBase ?? 0), 0);

  function ouvrirAjout() {
    setFraisEnEdition(null);
    setModalOuverte(true);
  }

  function ouvrirEdition(f: IFrais) {
    setFraisEnEdition(f);
    setModalOuverte(true);
  }

  async function gererSuppression(f: IFrais) {
    const ok = await confirmer({
      titre: "Supprimer ce frais ?",
      description: `${LIBELLE_CATEGORIE[f.categorie]} - ${f.libelle} (${Math.round(f.montantEnBase).toLocaleString("fr-FR")} F)`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(f.id);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const liste = frais ?? [];

  return (
    <div className="space-y-3">
      {/* Header total + bouton */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <p className="text-xs text-muted">Total frais d&apos;approche</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMontant(total)} <span className="text-sm text-muted">F</span>
          </p>
        </div>
        {modifiable && (
          <Button variant="primary" className="gap-2" onPress={ouvrirAjout}>
            <Plus size={14} />
            Ajouter
          </Button>
        )}
      </div>

      {/* Liste ou empty state */}
      {liste.length === 0 ? (
        <EmptyState
          icone={Receipt}
          titre="Aucun frais d'approche"
          description={
            modifiable
              ? "Ajoutez les frais de transport, douane, transit, assurance pour calculer le cout debarque reel."
              : "Cette commande n'a pas de frais d'approche enregistres."
          }
          variante="subtle"
        />
      ) : (
        <ul className="space-y-2">
          {liste.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/5 transition-colors"
            >
              <Chip variant="soft" size="sm" className={CLASSES_CATEGORIE[f.categorie]}>
                {LIBELLE_CATEGORIE[f.categorie]}
              </Chip>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.libelle}</p>
                {f.notes && (
                  <p className="text-xs text-muted truncate">{f.notes}</p>
                )}
              </div>
              <div className="text-right">
                {f.devise !== "XOF" ? (
                  <>
                    <p className="text-xs text-muted tabular-nums">
                      {formatMontant(f.montant)} {f.devise}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMontant(f.montantEnBase)} F
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMontant(f.montantEnBase)} F
                  </p>
                )}
              </div>
              {modifiable && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="p-1.5"
                    onPress={() => ouvrirEdition(f)}
                    aria-label="Modifier"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="p-1.5 text-danger"
                    onPress={() => gererSuppression(f)}
                    aria-label="Supprimer"
                    isDisabled={supprimer.isPending}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ModalFrais
        ouvert={modalOuverte}
        commandeId={commandeId}
        frais={fraisEnEdition}
        onFermer={() => setModalOuverte(false)}
      />
    </div>
  );
}
