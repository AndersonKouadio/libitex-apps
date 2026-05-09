"use client";

import { useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useSupprimerEmplacementMutation } from "@/features/stock/queries/emplacement.mutations";
import { ModalEmplacement } from "@/features/stock/components/modal-emplacement";
import type { IEmplacement } from "@/features/stock/types/stock.type";
import { useConfirmation } from "@/providers/confirmation-provider";

const LABELS_TYPE: Record<string, string> = {
  STORE: "Boutique",
  WAREHOUSE: "Entrepôt",
  TRUCK: "Camion",
  STAND: "Stand",
};

export default function PageEmplacements() {
  const { data: emplacements, isLoading } = useEmplacementListQuery();
  const supprimer = useSupprimerEmplacementMutation();
  const confirmer = useConfirmation();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<IEmplacement | null>(null);

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }

  function ouvrirEdition(emp: IEmplacement) {
    setEnEdition(emp);
    setModalOuvert(true);
  }

  async function handleSupprimer(emp: IEmplacement) {
    const ok = await confirmer({
      titre: "Supprimer cet emplacement ?",
      description: `« ${emp.nom} » sera supprimé. Cette action échoue s'il contient encore du stock — videz-le par transfert avant.`,
      actionLibelle: "Supprimer",
    });
    if (!ok) return;
    await supprimer.mutateAsync(emp.id);
  }

  return (
    <PageContainer>
      <PageHeader
        titre={isLoading ? "Emplacements..." : `${(emplacements ?? []).length} emplacement${(emplacements ?? []).length > 1 ? "s" : ""}`}
        description="Vos points de vente, entrepôts, camions ou stands. Le stock est compté séparément à chaque emplacement et peut être transféré entre eux."
        actions={
          <Button variant="primary" className="gap-1.5" onPress={ouvrirCreation}>
            <Plus size={16} />
            Nouvel emplacement
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-[80px] rounded-xl" />)}
        </div>
      ) : (emplacements ?? []).length === 0 ? (
        <Card>
          <Card.Content className="py-16 text-center">
            <MapPin size={32} className="text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucun emplacement</p>
            <p className="text-sm text-muted mt-1 mb-4">
              Créez votre premier point de vente, entrepôt ou camion.
            </p>
            <Button variant="primary" className="gap-1.5" onPress={ouvrirCreation}>
              <Plus size={16} />
              Créer un emplacement
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(emplacements ?? []).map((emp) => (
            <Card key={emp.id} className="group">
              <Card.Content className="p-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{emp.nom}</p>
                    <p className="text-xs text-muted mt-0.5">{LABELS_TYPE[emp.type] ?? emp.type}</p>
                    {emp.adresse && (
                      <p className="text-xs text-muted mt-1 truncate">{emp.adresse}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
                      onPress={() => ouvrirEdition(emp)}
                      aria-label={`Modifier ${emp.nom}`}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                      onPress={() => handleSupprimer(emp)}
                      aria-label={`Supprimer ${emp.nom}`}
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

      <ModalEmplacement
        ouvert={modalOuvert}
        emplacement={enEdition}
        onFermer={() => setModalOuvert(false)}
      />
    </PageContainer>
  );
}
