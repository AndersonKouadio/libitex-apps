"use client";

import { useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { Plus, Store } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBoutiqueListQuery } from "@/features/boutique/queries/boutique-list.query";
import { CarteBoutique } from "@/features/boutique/components/carte-boutique";
import { ModalCreerBoutique } from "@/features/boutique/components/modal-creer-boutique";

export default function PageBoutiques() {
  const { boutiques: boutiquesSession } = useAuth();
  const { data: boutiquesAPI, isLoading } = useBoutiqueListQuery();
  const [modalOuvert, setModalOuvert] = useState(false);

  const boutiques = boutiquesAPI ?? boutiquesSession;

  return (
    <>
      <Topbar titre="Mes boutiques" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <p className="text-sm text-muted max-w-xl">
              Vous pouvez gerer plusieurs boutiques avec un meme compte. Chaque boutique a son
              propre catalogue, son stock et ses ventes.
            </p>
          </div>
          <Button variant="primary" className="gap-1.5 shrink-0" onPress={() => setModalOuvert(true)}>
            <Plus size={16} />
            Nouvelle boutique
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-xl" />
            ))}
          </div>
        ) : boutiques.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <Store size={32} className="text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucune boutique</p>
            <p className="text-sm text-muted mt-1 mb-4">
              Creez votre premiere boutique pour commencer
            </p>
            <Button variant="primary" className="gap-1.5" onPress={() => setModalOuvert(true)}>
              <Plus size={16} />
              Creer une boutique
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boutiques.map((b) => (
              <CarteBoutique key={b.id} boutique={b} />
            ))}
          </div>
        )}
      </div>

      <ModalCreerBoutique ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} />
    </>
  );
}
