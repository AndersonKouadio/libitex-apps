"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Skeleton, Chip } from "@heroui/react";
import { Plus, Pencil, Trash2, UtensilsCrossed, Package } from "lucide-react";
import {
  useSupplementListQuery, useSupprimerSupplementMutation,
} from "@/features/supplement/queries/supplement.query";
import { ModalSupplement } from "@/features/supplement/components/modal-supplement";
import { LABELS_CATEGORIE_SUPPLEMENT, type ISupplement } from "@/features/supplement/types/supplement.type";
import { formatMontant } from "@/features/vente/utils/format";

const COULEURS_CATEGORIE: Record<string, string> = {
  NOURRITURE: "bg-success/10 text-success",
  BOISSON: "bg-accent/10 text-accent",
  ACCESSOIRE: "bg-warning/10 text-warning",
  AUTRE: "bg-muted/10 text-muted",
};

export default function PageSupplements() {
  const { data, isLoading } = useSupplementListQuery();
  const supprimer = useSupprimerSupplementMutation();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<ISupplement | null>(null);

  const supplements = data ?? [];

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }

  function ouvrirEdition(s: ISupplement) {
    setEnEdition(s);
    setModalOuvert(true);
  }

  async function handleSupprimer(s: ISupplement) {
    if (!window.confirm(`Supprimer le supplément « ${s.nom} » ?`)) return;
    await supprimer.mutateAsync(s.id);
  }

  return (
    <PageContainer>
      <PageHeader
        titre={`${supplements.length} supplément${supplements.length > 1 ? "s" : ""}`}
        description="Sauces, accompagnements, boissons et options en surcoût proposés à la commande."
        actions={
          <Button variant="primary" className="gap-1.5" onPress={ouvrirCreation}>
            <Plus size={16} />
            Nouveau supplément
          </Button>
        }
      />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
          </div>
        ) : supplements.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-warning/10 inline-flex items-center justify-center mb-3">
              <UtensilsCrossed size={20} className="text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun supplément</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Créez vos premiers suppléments (sauce piquante, double fromage, frites moyennes...) pour
              les rattacher à vos menus.
            </p>
            <Button variant="primary" className="gap-1.5 mt-4" onPress={ouvrirCreation}>
              <Plus size={16} />
              Créer un supplément
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplements.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  s.actif
                    ? "border-border bg-surface hover:border-accent/40"
                    : "border-border bg-surface-secondary opacity-70"
                }`}
              >
                <div className="aspect-[3/2] bg-surface-secondary overflow-hidden flex items-center justify-center">
                  {s.image ? (
                    <img src={s.image} alt={s.nom} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package size={28} className="text-muted/30" />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{s.nom}</p>
                    <Chip className={`text-[10px] shrink-0 ${COULEURS_CATEGORIE[s.categorie] ?? ""}`}>
                      {LABELS_CATEGORIE_SUPPLEMENT[s.categorie]}
                    </Chip>
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted line-clamp-2 mb-2">{s.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {formatMontant(s.prix)}
                      <span className="text-xs font-normal text-muted ml-0.5">F</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                        onPress={() => ouvrirEdition(s)}
                        aria-label="Modifier"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                        onPress={() => handleSupprimer(s)}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <ModalSupplement
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        supplement={enEdition}
      />
    </PageContainer>
  );
}
