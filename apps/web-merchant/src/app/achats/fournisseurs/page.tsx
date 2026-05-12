"use client";

import { useState } from "react";
import {
  Button, SearchField, Card, Skeleton,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Phone, Mail, Building2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useFournisseurListQuery, useSupprimerFournisseurMutation } from "@/features/achat/queries/achat.query";
import { ModalFournisseur } from "@/features/achat/components/modal-fournisseur";
import { useConfirmation } from "@/providers/confirmation-provider";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { IFournisseur } from "@/features/achat/types/achat.type";

export default function PageFournisseurs() {
  const [recherche, setRecherche] = useState("");
  // Fix m2 : debounce 300ms pour eviter un refetch a chaque keystroke
  // (sur 3G, ~500ms par requete = friction visible).
  const rechercheDebounced = useDebouncedValue(recherche, 300);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<IFournisseur | null>(null);
  const { data: fournisseurs, isLoading } = useFournisseurListQuery(rechercheDebounced || undefined);
  const supprimer = useSupprimerFournisseurMutation();
  const confirmer = useConfirmation();

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }
  function ouvrirEdition(f: IFournisseur) {
    setEnEdition(f);
    setModalOuvert(true);
  }
  async function handleSupprimer(f: IFournisseur) {
    const ok = await confirmer({
      titre: "Supprimer ce fournisseur ?",
      description: `« ${f.nom} » sera marque comme supprime. L'historique de commandes reste consultable.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(f.id);
  }

  return (
    <PageContainer>
      <PageHeader
        titre={`${fournisseurs?.length ?? 0} fournisseur${(fournisseurs?.length ?? 0) > 1 ? "s" : ""}`}
        description="Repertoire des fournisseurs reguliers — utilises a la creation des bons de commande."
        actions={
          <Button variant="primary" className="gap-2" onPress={ouvrirCreation}>
            <Plus size={16} />
            Nouveau fournisseur
          </Button>
        }
      />

      <div className="mb-4">
        <SearchField
          value={recherche}
          onChange={setRecherche}
          aria-label="Rechercher un fournisseur"
          className="max-w-md w-full"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Rechercher par nom, contact, telephone ou email" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (fournisseurs?.length ?? 0) === 0 ? (
        <Card>
          <Card.Content className="p-10 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-muted opacity-50" />
            <p className="text-sm text-foreground font-medium">Aucun fournisseur</p>
            <p className="text-xs text-muted mt-1">
              Ajoutez vos fournisseurs habituels pour creer rapidement des bons de commande.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {(fournisseurs ?? []).map((f) => (
            <Card key={f.id} className="hover:border-accent/30 transition-colors">
              <Card.Content className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{f.nom}</p>
                    {f.nomContact && (
                      <p className="text-xs text-muted mt-0.5">{f.nomContact}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                      {f.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {f.telephone}
                        </span>
                      )}
                      {f.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} /> {f.email}
                        </span>
                      )}
                    </div>
                    {f.conditionsPaiement && (
                      <p className="text-xs text-foreground mt-2">
                        <span className="text-muted">Paiement : </span>
                        {f.conditionsPaiement}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 min-w-0"
                      aria-label="Modifier"
                      onPress={() => ouvrirEdition(f)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 min-w-0 text-danger"
                      aria-label="Supprimer"
                      onPress={() => handleSupprimer(f)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      <ModalFournisseur
        ouvert={modalOuvert}
        fournisseur={enEdition}
        onFermer={() => setModalOuvert(false)}
      />
    </PageContainer>
  );
}
